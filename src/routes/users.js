import express from "express"
import User from "../models/Users.js"
import UserRole from "../Enums/UserRole.js"
import { authenticateToken } from "../middleware/auth.js"

const router = express.Router()

// Tu endpoint existente (sin cambios)
router.post("/", async (req, res) => {
  const { auth0Id, email, name, picture } = req.body

  if (!auth0Id || !email) return res.status(400).json({ message: "auth0Id y email son requeridos" })

  try {
    // Buscamos si ya existe un usuario con ese email o auth0Id
    let user = await User.findOne({ $or: [{ auth0Id }, { email }] })

    if (!user) {
      // Si no existe, creamos uno nuevo
      user = new User({ auth0Id, email, name, picture })
      await user.save()
      return res.status(201).json({ message: "Usuario creado" })
    }

    // Si existe, actualizamos los datos
    user.auth0Id = auth0Id
    user.email = email
    user.name = name
    user.picture = picture
    await user.save()

    res.json({ message: "Usuario actualizado" })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Error interno del servidor" })
  }
})

// ENDPOINT CORREGIDO: Obtener perfil y verificar permisos
router.get("/profile", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.sub
    const userEmail = req.user.email

    // Buscar usuario existente en la base de datos
    const user = await User.findOne({ auth0Id: userId })

    if (!user) {
      console.log(`❌ Usuario no encontrado en la base de datos: ${userEmail}`)
      return res.status(403).json({
        message: "Usuario no autorizado. Contacta al administrador para obtener acceso.",
        isAdmin: false,
        role: null,
        permissions: [],
        debug: {
          searchedAuth0Id: userId,
          searchedEmail: userEmail,
          foundUser: false,
        },
      })
    }

    // Verificar si es admin usando tu enum
    const isAdmin = user.role === UserRole.ADMIN
    res.json({
      user: {
        id: user._id,
        auth0Id: user.auth0Id,
        email: user.email,
        name: user.name,
        picture: user.picture,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      role: user.role,
      isAdmin: isAdmin,
      permissions: isAdmin
        ? ["create_matches", "manage_teams", "manage_players", "manage_users", "view_analytics"]
        : [],
      message: isAdmin ? "Acceso de administrador concedido" : "Usuario estándar autorizado",
      debug: {
        searchedAuth0Id: userId,
        foundAuth0Id: user.auth0Id,
        userRole: user.role,
        isAdminCheck: isAdmin,
        userRoleEnum: UserRole.ADMIN,
      },
    })
  } catch (error) {
    console.error("❌ Error obteniendo perfil:", error)
    res.status(500).json({
      message: "Error interno del servidor",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    })
  }
})

// Endpoint específico para verificar permisos de admin
router.get("/check-admin", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.sub
    const user = await User.findOne({ auth0Id: userId })

    if (!user) {
      return res.json({
        isAdmin: false,
        role: null,
        permissions: [],
        message: "Usuario no encontrado en la base de datos",
      })
    }

    const isAdmin = user.role === UserRole.ADMIN

    res.json({
      isAdmin,
      role: user.role,
      permissions: isAdmin
        ? ["create_matches", "manage_teams", "manage_players", "manage_users", "view_analytics"]
        : [],
    })
  } catch (error) {
    console.error("Error verificando admin:", error)
    res.status(500).json({ message: "Error verificando permisos" })
  }
})

export default router
