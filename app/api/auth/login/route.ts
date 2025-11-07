import { NextResponse } from 'next/server';

const LOGIN_API_URL = 'https://admin.hebesbychloe.com/wp-content/themes/flatsome-child/backend-dfcflow/auth/login.php';

// POST - Login user using Hebes Login API
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    // Call Hebes Login API with timeout
    console.log('🔄 Calling Hebes login API...');
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000); // 12 second timeout
    
    let response;
    try {
      response = await fetch(LOGIN_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        console.error('❌ Login API request timed out');
        return NextResponse.json({ 
          error: 'Login request timed out. The server may be slow or unreachable.',
          details: 'Please check your connection and try again.'
        }, { status: 504 });
      }
      throw fetchError;
    }

    let result;
    try {
      result = await response.json();
      console.log('📦 Login API raw response:', JSON.stringify(result, null, 2));
    } catch (parseError) {
      console.error('❌ Failed to parse login API response:', parseError);
      const text = await response.text();
      console.error('Response text:', text.substring(0, 500));
      return NextResponse.json({ 
        error: 'Invalid response from login server',
        details: 'The server returned an unexpected response format.'
      }, { status: 500 });
    }

    // Handle errors from login API
    if (!response.ok || !result.success) {
      const errorMessage = result.data || result.message || result.error || 'Invalid email or password';
      console.error('❌ Login API error:', { status: response.status, success: result.success, errorMessage });
      
      // Map HTTP status codes
      if (response.status === 400 || response.status === 401) {
        return NextResponse.json({ error: errorMessage }, { status: 401 });
      }
      if (response.status === 404) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
      
      return NextResponse.json({ error: errorMessage }, { status: response.status });
    }

    // Extract token and user data from response - handle different response formats
    let token: string | undefined;
    let apiUser: any | undefined;

    // Try different possible response structures
    if (result.data) {
      // Format 1: { success: true, data: { token: "...", user: {...} } }
      if (typeof result.data === 'object' && result.data !== null) {
        token = result.data.token;
        apiUser = result.data.user;
      }
    } else if (result.token) {
      // Format 2: { success: true, token: "...", user: {...} }
      token = result.token;
      apiUser = result.user;
    } else if (result.jwt || result.jwt_token) {
      // Format 3: { success: true, jwt: "...", user: {...} }
      token = result.jwt || result.jwt_token;
      apiUser = result.user;
    }

    console.log('🔍 Extracted from response:', { 
      hasToken: !!token, 
      hasUser: !!apiUser,
      tokenLength: token?.length || 0,
      userKeys: apiUser ? Object.keys(apiUser) : []
    });

    if (!token) {
      console.error('❌ No token found in response. Response structure:', {
        hasData: !!result.data,
        dataType: typeof result.data,
        dataKeys: result.data && typeof result.data === 'object' ? Object.keys(result.data) : [],
        resultKeys: Object.keys(result),
        fullResult: result
      });
      return NextResponse.json({ 
        error: 'No token received from login API',
        details: 'The login server did not return an authentication token. Please check the server response format.'
      }, { status: 500 });
    }

    if (!apiUser) {
      console.error('❌ No user data found in response. Response structure:', {
        hasData: !!result.data,
        dataType: typeof result.data,
        fullResult: result
      });
      return NextResponse.json({ 
        error: 'No user data received from login API',
        details: 'The login server did not return user information.'
      }, { status: 500 });
    }

    // Map API user fields to our user format
    const user = {
      id: apiUser.id,
      name: apiUser.full_name || apiUser.name || email,
      email: apiUser.email,
      phone: apiUser.phone || null,
      role: apiUser.role || 'user',
      avatar_url: apiUser.avatar_url || null,
      timezone: apiUser.timezone || null,
      status: apiUser.status_work || 'active',
      // Additional fields from API
      team: apiUser.team || null,
      location: apiUser.location || null,
    };

    return NextResponse.json({ 
      user,
      token,
      success: true 
    }, { status: 200 });
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json({ 
      error: 'Login failed', 
      details: error.message 
    }, { status: 500 });
  }
}

