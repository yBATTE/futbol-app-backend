import mongoose from 'mongoose'
import UserRole from '../Enums/UserRole.js'

const userSchema = new mongoose.Schema({
  auth0Id: { type: String, unique: true, required: true },
  email: String,
  name: String,
  picture: String,
  role: {
    type: String,
    enum: Object.values(UserRole),
    default: UserRole.VIEWER
  }

}, { timestamps: true })

const User = mongoose.model('User', userSchema)

export default User
