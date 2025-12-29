/**
 * Safe fetch utilities for handling responses
 */

/**
 * Safely parse JSON response
 */
export async function safeJsonResponse<T = any>(
  response: Response
): Promise<T> {
  try {
    const text = await response.text();
    if (!text) {
      return {} as T;
    }
    return JSON.parse(text) as T;
  } catch (error) {
    console.error("Error parsing JSON response:", error);
    throw new Error("응답을 파싱할 수 없습니다");
  }
}

/**
 * Handle fetch response with error checking
 */
export async function handleFetchResponse<T = any>(
  response: Response
): Promise<T> {
  const data = await safeJsonResponse<T>(response);
  
  if (!response.ok) {
    const error = (data as any)?.error || `HTTP ${response.status}: ${response.statusText}`;
    throw new Error(error);
  }
  
  return data;
}

/**
 * Fetch with automatic error handling
 */
export async function safeFetch<T = any>(
  url: string,
  options?: RequestInit
): Promise<T> {
  try {
    const response = await fetch(url, options);
    return await handleFetchResponse<T>(response);
  } catch (error: any) {
    if (error.message) {
      throw error;
    }
    throw new Error("요청 처리 중 오류가 발생했습니다");
  }
}

