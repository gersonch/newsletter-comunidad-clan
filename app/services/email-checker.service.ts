export async function checkEmailService(
  email: string,
  apiKey: string
): Promise<any> {
  const response = await fetch("https://app.mailercheck.com/api/check/single", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${apiKey}`,
      "User-Agent": "PostmanRuntime/7.36.3",
    },
    body: JSON.stringify({ email }),
  });
  return response.json();
}
