import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64 } = await req.json();
    
    if (!imageBase64) {
      return new Response(JSON.stringify({ error: 'No image provided' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Input validation: Check size limit (5MB base64 encoded = ~7MB)
    const maxBase64Size = 7 * 1024 * 1024; // 7MB for base64 encoded image
    if (typeof imageBase64 !== 'string' || imageBase64.length > maxBase64Size) {
      return new Response(JSON.stringify({ error: 'Image too large (max 5MB)' }), {
        status: 413,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate base64 format
    const base64Pattern = /^(data:image\/(jpeg|jpg|png|gif|webp);base64,)?[A-Za-z0-9+/]+=*$/;
    const imageData = imageBase64.startsWith('data:') 
      ? imageBase64.split(',')[1] || ''
      : imageBase64;
    
    if (!base64Pattern.test(imageBase64) && !imageData.match(/^[A-Za-z0-9+/]+=*$/)) {
      return new Response(JSON.stringify({ error: 'Invalid image format' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    console.log('Processing OCR request with Gemini...');

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
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
            content: `You are an OCR specialist for Korean Costco price tags. Extract the following information from the image:
1. Product ID (7-digit number, usually at the top or bottom of the price tag)
2. Product Name (Korean text - IMPORTANT: Focus on the MAIN product name in LARGER font. Include weight, quantity info. IGNORE small English text that appears as secondary/subtitle. For example: 'SWISS MISS 핫코코아 GIFT 780G' is correct, but DO NOT include smaller secondary text like 'SWISS MISS GIFT TIN' that appears below or beside in smaller font.)
3. Current Price (the main selling price)
4. Original Price (if there's a discount, this is the crossed-out or smaller price)
5. Discount Period (date range if visible, format: MM/DD - MM/DD)

Respond ONLY in valid JSON format with these exact keys:
{
  "productId": "string or null",
  "productName": "string or null - MAIN NAME ONLY, IGNORE SMALL SECONDARY TEXT", 
  "currentPrice": "number as string or null",
  "originalPrice": "number as string or null",
  "discountPeriod": "string or null"
}

For prices, extract only the numeric value without commas or currency symbols.
If a field cannot be determined, use null.
IMPORTANT: 
- For product names, include the MAIN name with volume/weight (e.g., 600g, 1.5L) and quantity (e.g., 48 ct, x 5입) if visible in LARGE font.
- IGNORE any small English text that appears as secondary description or subtitle.
- Focus on what appears in the LARGEST, most prominent font for the product name.`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: '이 코스트코 가격표에서 상품 정보를 추출해주세요.'
              },
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

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'API credits exhausted. Please add credits.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    console.log('Gemini response:', content);

    // Parse the JSON response from Gemini
    let extractedData;
    try {
      // Clean up the response - remove markdown code blocks if present
      const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      extractedData = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error('Failed to parse Gemini response:', parseError);
      extractedData = {
        productId: null,
        productName: null,
        currentPrice: null,
        originalPrice: null,
        discountPeriod: null
      };
    }

    return new Response(JSON.stringify(extractedData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('OCR Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'OCR processing failed';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
