# Auth Testing — Panou Antrenor

Auth uses JWT Bearer tokens (localStorage key `pa_token`), NOT httpOnly cookies.

## Demo account
- Email: antrenor@elvisprocut.ro
- Password: Antrenor2025!

## API tests
curl -X POST $URL/api/auth/login -H "Content-Type: application/json" -d '{"email":"antrenor@elvisprocut.ro","password":"Antrenor2025!"}'
# returns {token, user}
curl $URL/api/auth/me -H "Authorization: Bearer <token>"
