import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { RolesSistema } from "../interfaces/shared/RolesSistema";
import { PrismaClient } from "@prisma/client";
import { verificarBloqueoRol } from "../lib/helpers/verificators/verificarBloqueoRol";
import {
  JWTPayload,
  ProfesorTutorSecundariaAuthenticated,
} from "../interfaces/JWTPayload";
import { TokenErrorTypes } from "../interfaces/shared/errors/TokenErrorTypes";
import { UserErrorTypes } from "../interfaces/shared/errors/UserErrorTypes";
import { PermissionErrorTypes } from "../interfaces/shared/errors/PermissionErrorTypes";
import { SystemErrorTypes } from "../interfaces/shared/errors/SystemErrorTypes";

const prisma = new PrismaClient();

// Middleware para verificar si el usuario es un Tutor de Secundaria
const isTutorAuthenticated = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Si ya está autenticado con algún rol, continuar
    if (req.isAuthenticated) {
      return next();
    }
    // Obtener el token del encabezado de autorización
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      // Almacenar el error en req para que checkAuthentication pueda usarlo
      req.authError = {
        type: TokenErrorTypes.TOKEN_MISSING,
        message: "No se ha proporcionado un token de autenticación",
      };
      return next();
    }

    // Verificar el formato "Bearer <token>"
    const parts = authHeader.split(" ");
    if (parts.length !== 2 || parts[0] !== "Bearer") {
      req.authError = {
        type: TokenErrorTypes.TOKEN_INVALID_FORMAT,
        message: "Formato de token no válido",
      };
      return next();
    }

    const token = parts[1];
    const jwtSecretKey = process.env.JWT_KEY_TUTORES!;

    try {
      // Verificar el token
      const decoded = jwt.verify(token, jwtSecretKey) as JWTPayload;

      // Verificar que el rol sea de Tutor Secundaria
      if (decoded.Rol !== RolesSistema.Tutor) {
        req.authError = {
          type: TokenErrorTypes.TOKEN_WRONG_ROLE,
          message: "El token no corresponde a un usuario tutor de secundaria",
        };
        return next();
      }

      try {
        // Verificar si el rol está bloqueado
        const bloqueado = await verificarBloqueoRol(
          req,
          RolesSistema.Tutor,
          next
        );

        if (bloqueado) {
          return; // La función verificarBloqueoRol ya llamó a next()
        }

        // Verificar si el profesor de secundaria (tutor) existe y está activo
        const profesor = await prisma.t_Profesores_Secundaria.findUnique({
          where: {
            DNI_Profesor_Secundaria: decoded.ID_Usuario,
          },
          select: {
            Estado: true,
            aulas: {
              select: {
                Id_Aula: true,
              },
            },
          },
        });

        if (!profesor || !profesor.Estado) {
          req.authError = {
            type: UserErrorTypes.USER_INACTIVE,
            message: "La cuenta de profesor está inactiva o no existe",
          };
          return next();
        }

        // Verificar que el profesor tenga un aula asignada (lo que lo convierte en tutor)
        if (profesor.aulas.length === 0) {
          req.authError = {
            type: PermissionErrorTypes.INSUFFICIENT_PERMISSIONS,
            message: "El profesor no tiene un aula asignada como tutor",
          };
          return next();
        }
      } catch (dbError) {
        req.authError = {
          type: SystemErrorTypes.DATABASE_ERROR,
          message: "Error al verificar el estado del usuario o rol",
          details: dbError,
        };
        return next();
      }

      // Agregar información del usuario decodificada a la solicitud para uso posterior
      req.user = {
        DNI_Profesor_Secundaria: decoded.ID_Usuario,
        Nombre_Usuario: decoded.Nombre_Usuario,
      } as ProfesorTutorSecundariaAuthenticated;
      // Marcar como autenticado para que los siguientes middlewares no reprocesen
      req.isAuthenticated = true;
      req.userRole = RolesSistema.Tutor;

      // Si todo está bien, continuar
      next();
    } catch (jwtError: any) {
      // Capturar errores específicos de JWT
      if (jwtError.name === "TokenExpiredError") {
        req.authError = {
          type: TokenErrorTypes.TOKEN_EXPIRED,
          message: "El token ha expirado",
          details: {
            expiredAt: jwtError.expiredAt,
          },
        };
      } else if (jwtError.name === "JsonWebTokenError") {
        if (jwtError.message === "invalid signature") {
          req.authError = {
            type: TokenErrorTypes.TOKEN_INVALID_SIGNATURE,
            message: "La firma del token es inválida",
          };
        } else {
          req.authError = {
            type: TokenErrorTypes.TOKEN_MALFORMED,
            message: "El token tiene un formato incorrecto",
            details: jwtError.message,
          };
        }
      } else {
        req.authError = {
          type: SystemErrorTypes.UNKNOWN_ERROR,
          message: "Error desconocido al verificar el token",
          details: jwtError,
        };
      }
      // Continuar al siguiente middleware
      next();
    }
  } catch (error) {
    console.error("Error en middleware de tutor de secundaria:", error);
    req.authError = {
      type: SystemErrorTypes.UNKNOWN_ERROR,
      message: "Error desconocido en el proceso de autenticación",
      details: error,
    };
    next();
  }
};

export default isTutorAuthenticated;
