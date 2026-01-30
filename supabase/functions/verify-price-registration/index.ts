import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VerificationRequest {
  imageBase64?: string;
  productId: string;
  storeId: string;
  userLatitude?: number;
  userLongitude?: number;
}

interface VerificationResponse {
  isValidImage: boolean;
  imageValidationMessage?: string;
  isDuplicate: boolean;
  duplicateMessage?: string;
  awardPoints: boolean;
  locationWarning?: string;
  pointsToAward: number;
}

// Calculate distance between two coordinates in km (Haversine formula)
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64, productId, storeId, userLatitude, userLongitude }: VerificationRequest = await req.json();

    if (!productId || !storeId) {
      return new Response(JSON.stringify({ error: 'productId and storeId are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const response: VerificationResponse = {
      isValidImage: true,
      isDuplicate: false,
      awardPoints: true,
      pointsToAward: 5,
    };

    // 1. Verify image is a valid Costco price tag using Gemini
    if (imageBase64) {
      console.log('Verifying image with Gemini...');
      const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
      
      if (LOVABLE_API_KEY) {
        try {
          const geminiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${LOVABLE_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'google/gemini-2.5-flash',
              messages: [
                {
                  role: 'system',
                  content: `You are a fraud detection specialist for a Costco price tracking app. 
Your job is to verify if an uploaded image is a valid Korean Costco price tag.

A valid Costco price tag typically has:
- A 7-digit product number
- Korean product name
- Price in Korean Won format (e.g., ₩15,990 or 15,990원)
- Costco branding or store elements
- Standard price tag layout

Respond ONLY in valid JSON format:
{
  "isValid": true/false,
  "confidence": 0-100,
  "reason": "explanation in Korean"
}

Mark as INVALID if:
- The image is clearly NOT a price tag (random photo, screenshot, etc.)
- It appears to be from a different store (not Costco)
- The image is too blurry to read
- It looks like a manipulated or edited image

Mark as VALID if:
- It appears to be an authentic Costco price tag
- Even if partially visible, as long as key elements are present`
                },
                {
                  role: 'user',
                  content: [
                    { type: 'text', text: '이 이미지가 유효한 코스트코 가격표인지 확인해주세요.' },
                    {
                      type: 'image_url',
                      image_url: {
                        url: imageBase64.startsWith('data:') ? imageBase64 : `data:image/jpeg;base64,${imageBase64}`
                      }
                    }
                  ]
                }
              ],
            }),
          });

          if (geminiResponse.ok) {
            const geminiData = await geminiResponse.json();
            const content = geminiData.choices?.[0]?.message?.content;
            
            try {
              const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
              const verification = JSON.parse(cleanContent);
              
              console.log('Image verification result:', verification);
              
              if (!verification.isValid || verification.confidence < 50) {
                response.isValidImage = false;
                response.imageValidationMessage = verification.reason || '유효하지 않은 이미지입니다.';
                response.awardPoints = false;
              }
            } catch (parseError) {
              console.error('Failed to parse Gemini response:', parseError);
              // If parsing fails, allow the registration to proceed
            }
          } else {
            console.error('Gemini API error:', geminiResponse.status);
          }
        } catch (geminiError) {
          console.error('Gemini verification error:', geminiError);
          // If Gemini fails, allow registration but log it
        }
      }
    }

    // 2. Check for duplicate registration within 24 hours
    console.log('Checking for duplicate registrations...');
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    
    const { data: recentRegistrations, error: duplicateError } = await supabase
      .from('price_history')
      .select('id, user_id, recorded_at')
      .eq('product_id', productId)
      .eq('store_id', storeId)
      .gte('recorded_at', twentyFourHoursAgo)
      .order('recorded_at', { ascending: false })
      .limit(5);

    if (duplicateError) {
      console.error('Duplicate check error:', duplicateError);
    } else if (recentRegistrations && recentRegistrations.length > 0) {
      response.isDuplicate = true;
      response.awardPoints = false;
      response.duplicateMessage = '24시간 내에 다른 사용자가 이미 이 상품의 가격을 등록했습니다. 가격 등록은 가능하지만 포인트가 지급되지 않습니다.';
      console.log(`Found ${recentRegistrations.length} recent registrations for product ${productId} at store ${storeId}`);
    }

    // 3. GPS Location validation
    if (userLatitude !== undefined && userLongitude !== undefined) {
      console.log('Validating user location...');
      
      const { data: storeData, error: storeError } = await supabase
        .from('stores')
        .select('latitude, longitude, name')
        .eq('id', storeId)
        .single();

      if (storeError) {
        console.error('Store fetch error:', storeError);
      } else if (storeData && storeData.latitude && storeData.longitude) {
        const distance = calculateDistance(
          userLatitude, 
          userLongitude, 
          storeData.latitude, 
          storeData.longitude
        );

        console.log(`Distance from ${storeData.name}: ${distance.toFixed(2)} km`);

        if (distance > 1) {
          response.locationWarning = `현재 위치가 선택한 매장(${storeData.name})과 ${distance.toFixed(1)}km 떨어져 있습니다. 올바른 매장을 선택했는지 확인해주세요.`;
        }
      }
    }

    // Set final point award
    if (!response.isValidImage || response.isDuplicate) {
      response.awardPoints = false;
      response.pointsToAward = 0;
    }

    console.log('Verification complete:', response);

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Verification error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Verification failed' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
