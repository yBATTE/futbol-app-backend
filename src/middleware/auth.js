import { expressjwt } from "express-jwt"
import jwksRsa from "jwks-rsa"
import dotenv from "dotenv"
import jwt from "jsonwebtoken"

dotenv.config()

export const checkJwt = expressjwt({
  secret: jwksRsa.expressJwtSecret({
    cache: true,
    rateLimit: true,
    jwksRequestsPerMinute: 5,
    jwksUri: `https://${process.env.AUTH0_DOMAIN}/.well-known/jwks.json`,
  }),
  audience: process.env.AUTH0_AUDIENCE,
  issuer: `https://${process.env.AUTH0_DOMAIN}/`,
  algorithms: ["RS256"],
})

export function getAuth0FromBearerToken(bearerToken) {
  if (!bearerToken || !bearerToken.startsWith("Bearer ")) {
    throw new Error("Invalid bearer token")
  }
  const token = bearerToken.split(" ")[1]
  const decoded = jwt.decode(token)
  return decoded
}

// Middleware para verificar autenticación y agregar user info
export const authenticateToken = async (req, res, next) => {
  try {
    // Primero verificamos el JWT
    checkJwt(req, res, async (err) => {
      if (err) {
        return res.status(401).json({ message: "Token inválido", error: err.message })
      }

      // Si el JWT es válido, agregamos la info del usuario decodificado
      const authHeader = req.headers["authorization"]
      if (authHeader) {
        try {
          const decoded = getAuth0FromBearerToken(authHeader)
          req.user = decoded
          next()
        } catch (error) {
          return res.status(401).json({ message: "Error decodificando token" })
        }
      } else {
        return res.status(401).json({ message: "Token de acceso requerido" })
      }
    })
  } catch (error) {
    return res.status(500).json({ message: "Error interno del servidor" })
  }
}
