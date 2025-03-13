import "dotenv/config";
import jwt from "jsonwebtoken";
import { RolesSistema } from "../../../../interfaces/RolesSistema";
import { DIRECTIVOS_SESSION_EXPIRATION } from "../../../../constants/expirations";
import { JWTPayload } from "../../../../interfaces/JWTPayload";

// Función para generar un token JWT para directivos
export function generateDirectivoToken(
  directivoId: number,
  nombre_usuario: string
): string {
  const jwtSecretKey = process.env.JWT_KEY_DIRECTIVOS!;

  const payload: JWTPayload = {
    ID_Usuario: String(directivoId),
    Nombre_Usuario: nombre_usuario,
    Rol: RolesSistema.Directivo,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + DIRECTIVOS_SESSION_EXPIRATION, //Duracion de Token de 5 Horas para directivos
  };

  return jwt.sign(payload, jwtSecretKey);
}
