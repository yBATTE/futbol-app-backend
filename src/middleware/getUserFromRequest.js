import jwt from 'jsonwebtoken'
import jwksRsa from 'jwks-rsa'
import User from '../models/Users.js'

const client = jwksRsa({
  jwksUri: `https://${process.env.AUTH0_DOMAIN}/.well-known/jwks.json`
})

function getKey(header, callback) {
  client.getSigningKey(header.kid, (err, key) => {
    if (err) {
      callback(err, null)
    } else {
      const signingKey = key.getPublicKey()
      callback(null, signingKey)
    }
  })
}

export async function getUserFromRequest(req) {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null

    const token = authHeader.split(' ')[1]

    return new Promise((resolve, reject) => {
      jwt.verify(
        token,
        getKey,
        {
          audience: process.env.AUTH0_AUDIENCE,
          issuer: `https://${process.env.AUTH0_DOMAIN}/`,
          algorithms: ['RS256']
        },
        async (err, decoded) => {
          if (err || !decoded?.sub) {
            return resolve(null)
          }

          const auth0Id = decoded.sub
          const user = await User.findOne({ auth0Id })
          return resolve(user || null)
        }
      )
    })
  } catch (err) {
    console.error('Error en getUserFromRequest:', err)
    return null
  }
}
