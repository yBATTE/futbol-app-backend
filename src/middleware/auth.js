import { expressjwt } from "express-jwt"
import jwksRsa from "jwks-rsa"
import dotenv from "dotenv"
import jwt from "jsonwebtoken"
import axios from "axios"

dotenv.config()

// ✅ Configuración del middleware JWT estándar
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

// ✅ Función para verificar token JWE con Auth0
const verifyJWEWithAuth0 = async (token) => {
  try {
    console.log("🔍 Verificando token JWE con Auth0 userinfo endpoint...")

    const response = await axios.get(`https://${process.env.AUTH0_DOMAIN}/userinfo`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      timeout: 10000, // 10 segundos timeout
    })

    console.log("✅ Token JWE verificado exitosamente:", {
      sub: response.data.sub,
      email: response.data.email,
      name: response.data.name,
    })

    return response.data
  } catch (error) {
    console.log("❌ Error verificando token JWE con Auth0:")
    console.log("   Status:", error.response?.status)
    console.log("   Data:", error.response?.data)
    console.log("   Message:", error.message)
    throw new Error(`Auth0 verification failed: ${error.response?.data?.error || error.message}`)
  }
}

export function getAuth0FromBearerToken(bearerToken) {
  if (!bearerToken || !bearerToken.startsWith("Bearer ")) {
    throw new Error("Invalid bearer token")
  }
  const token = bearerToken.split(" ")[1]
  const decoded = jwt.decode(token)
  return decoded
}

// ✅ Middleware híbrido que maneja JWT y JWE
export const authenticateToken = async (req, res, next) => {
  console.log("\n" + "=".repeat(80))
  console.log("🔍 INICIANDO VERIFICACIÓN DE TOKEN")
  console.log("=".repeat(80))

  const authHeader = req.headers.authorization
  console.log("📋 Header de autorización:", authHeader ? "Presente" : "Ausente")

  if (!authHeader) {
    console.log("❌ No se encontró header de autorización")
    return res.status(401).json({
      message: "Token requerido",
      error: "No authorization header found",
    })
  }

  if (!authHeader.startsWith("Bearer ")) {
    console.log("❌ Formato de header incorrecto")
    return res.status(401).json({
      message: "Token inválido",
      error: "Invalid authorization header format",
    })
  }

  const token = authHeader.split(" ")[1]
  console.log("🎫 Token extraído (primeros 50 chars):", token.substring(0, 50) + "...")
  console.log("📏 Longitud total del token:", token.length)

  // ✅ Detectar tipo de token
  const tokenParts = token.split(".")
  console.log("🔧 Partes del token:", tokenParts.length)

  if (tokenParts.length === 5) {
    // Es un JWE - usar Auth0 userinfo endpoint
    console.log("🔒 TOKEN JWE DETECTADO - Usando Auth0 userinfo endpoint")

    try {
      const userInfo = await verifyJWEWithAuth0(token)

      // Crear objeto user compatible con tu aplicación
      req.user = {
        sub: userInfo.sub,
        email: userInfo.email,
        name: userInfo.name,
        picture: userInfo.picture,
        email_verified: userInfo.email_verified,
        aud: process.env.AUTH0_AUDIENCE,
        iss: `https://${process.env.AUTH0_DOMAIN}/`,
        // Agregar campos adicionales que pueda necesitar tu app
        ...userInfo,
      }

      req.auth = req.user // Para compatibilidad con expressjwt

      console.log("✅ Usuario autenticado via JWE:", {
        sub: req.user.sub,
        email: req.user.email,
        name: req.user.name,
      })

      console.log("=".repeat(80))
      console.log("✅ VERIFICACIÓN JWE COMPLETADA EXITOSAMENTE")
      console.log("=".repeat(80) + "\n")

      return next()
    } catch (error) {
      console.log("❌ Error verificando token JWE:", error.message)
      return res.status(401).json({
        message: "Token JWE inválido",
        error: error.message,
        debug: {
          tokenLength: token.length,
          tokenParts: tokenParts.length,
          domain: process.env.AUTH0_DOMAIN,
        },
      })
    }
  } else if (tokenParts.length === 3) {
    // Es un JWT estándar - usar expressjwt
    console.log("✅ TOKEN JWT ESTÁNDAR DETECTADO - Usando expressjwt")

    checkJwt(req, res, (err) => {
      if (err) {
        console.log("\n❌ ERROR EN VERIFICACIÓN JWT:")
        console.log("📝 Mensaje:", err.message)
        console.log("🏷️  Código:", err.code)

        return res.status(401).json({
          message: "Token JWT inválido",
          error: err.message,
          code: err.code,
        })
      }

      console.log("\n✅ JWT VERIFICADO CORRECTAMENTE")
      console.log("👤 Usuario autenticado:", {
        sub: req.auth?.sub,
        email: req.auth?.email,
        name: req.auth?.name,
      })

      req.user = req.auth

      console.log("=".repeat(80))
      console.log("✅ VERIFICACIÓN JWT COMPLETADA EXITOSAMENTE")
      console.log("=".repeat(80) + "\n")

      next()
    })
  } else {
    console.log("❓ FORMATO DE TOKEN DESCONOCIDO")
    console.log("   Partes detectadas:", tokenParts.length)
    console.log("   Se esperaba 3 (JWT) o 5 (JWE)")

    return res.status(401).json({
      message: "Formato de token no reconocido",
      error: `Token has ${tokenParts.length} parts, expected 3 (JWT) or 5 (JWE)`,
      debug: {
        tokenLength: token.length,
        tokenParts: tokenParts.length,
      },
    })
  }
}

// ✅ Función para verificar configuración
export const verifyAuth0Config = () => {
  console.log("\n🔧 VERIFICANDO CONFIGURACIÓN AUTH0")
  console.log("=".repeat(50))

  const requiredVars = ["AUTH0_DOMAIN", "AUTH0_AUDIENCE"]
  const missing = requiredVars.filter((varName) => !process.env[varName])

  if (missing.length > 0) {
    console.log("❌ Variables de entorno faltantes:", missing)
    return false
  }

  console.log("✅ Todas las variables de entorno están configuradas:")
  requiredVars.forEach((varName) => {
    console.log(`   ${varName}: ${process.env[varName]}`)
  })

  console.log("\n🌐 Endpoint de verificación JWE:")
  console.log(`   ${process.env.AUTH0_DOMAIN}/userinfo`)

  return true
}

// ✅ Ejecutar verificación al cargar el módulo
verifyAuth0Config()
