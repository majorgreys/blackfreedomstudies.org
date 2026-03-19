// OAuth initiation endpoint — redirects user to GitHub for authorization
export async function onRequestGet(context) {
  const clientId = context.env.GITHUB_CLIENT_ID;
  const redirectUri = new URL('/callback', context.request.url).href;

  const authUrl = new URL('https://github.com/login/oauth/authorize');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('scope', 'repo,user');

  return Response.redirect(authUrl.toString(), 302);
}
