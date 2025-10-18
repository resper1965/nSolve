// Pages Function for Vulnerabilities API
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const path = pathname.replace('/api/vulnerabilities/', '');
  
  const apiUrl = `https://core-processor.ness.workers.dev/vulnerabilities/${path}`;
  
  try {
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': request.headers.get('Authorization') || '',
      },
    });
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'API service unavailable' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const path = pathname.replace('/api/vulnerabilities/', '');
  
  const apiUrl = `https://core-processor.ness.workers.dev/vulnerabilities/${path}`;
  const body = await request.json();
  
  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': request.headers.get('Authorization') || '',
      },
      body: JSON.stringify(body),
    });
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'API service unavailable' }, { status: 500 });
  }
}
