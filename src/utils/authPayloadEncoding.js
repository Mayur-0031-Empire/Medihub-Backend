const AUTH_ENCODING_FLAG = "base64json-v1";

const AUTH_FIELDS = [
  "firstName",
  "lastName",
  "username",
  "usernameOrEmail",
  "identifier",
  "role",
  "email",
  "phone",
  "password",
  "confirmPassword",
];

function decodeBase64Utf8(value) {
  return Buffer.from(String(value), "base64").toString("utf8");
}

export function decodeAuthPayload(body = {}) {
  if (body.__authEncoding !== AUTH_ENCODING_FLAG) {
    return body;
  }

  const decoded = { ...body };
  for (const field of AUTH_FIELDS) {
    if (decoded[field] == null) continue;
    decoded[field] = decodeBase64Utf8(decoded[field]);
  }
  delete decoded.__authEncoding;
  return decoded;
}
