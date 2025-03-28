import { Request, Response, Router } from "express";
import { PrismaClient } from "@prisma/client";
import { generateDirectivoToken } from "../../../../lib/helpers/functions/jwt/generators/directivoToken";
import { verifyDirectivoPassword } from "../../../../lib/helpers/encriptations/directivo.encriptation";
import { RolesSistema } from "../../../../interfaces/shared/RolesSistema";
import { Genero } from "../../../../interfaces/shared/Genero";
import { LoginBody } from "../auxiliar";
import { ResponseSuccessLogin } from "../../../../interfaces/shared/apis/shared/login/types";
import { AuthBlockedDetails } from "../../../../interfaces/shared/apis/errors/details/AuthBloquedDetails";

const router = Router();
const prisma = new PrismaClient();

router.get("/", (async (req: Request, res: Response) => {
  return res.json({ message: "Login Directivo" });
}) as any);

// Ruta de login
router.post("/", (async (req: Request, res: Response) => {
  try {
    const { Nombre_Usuario, Contraseña }: LoginBody = req.body;

    // Validar que se proporcionen ambos campos
    if (!Nombre_Usuario || !Contraseña) {
      return res.status(400).json({
        success: false,
        message: "El nombre de usuario y la contraseña son obligatorios",
      });
    }

    // Verificar si el rol de directivo está bloqueado
    try {
      // Primero verificamos bloqueo total, sin importar el timestamp
      const bloqueoRol = await prisma.t_Bloqueo_Roles.findFirst({
        where: {
          Rol: RolesSistema.Directivo,
          Bloqueo_Total: true,
        },
      });

      // Dentro del bloque donde verificas el bloqueo:
      if (bloqueoRol) {
        const tiempoActual = Math.floor(Date.now() / 1000);
        const timestampDesbloqueo = Number(bloqueoRol.Timestamp_Desbloqueo);

        // Determinamos si es un bloqueo permanente (timestamp = 0 o en el pasado)
        const esBloqueoPermanente =
          timestampDesbloqueo <= 0 || timestampDesbloqueo <= tiempoActual;

        // Calculamos el tiempo restante solo si NO es un bloqueo permanente
        let tiempoRestante = "Permanente";
        let fechaFormateada = "No definida";

        if (!esBloqueoPermanente) {
          const tiempoRestanteSegundos = timestampDesbloqueo - tiempoActual;
          const horasRestantes = Math.floor(tiempoRestanteSegundos / 3600);
          const minutosRestantes = Math.floor(
            (tiempoRestanteSegundos % 3600) / 60
          );
          tiempoRestante = `${horasRestantes}h ${minutosRestantes}m`;

          // Formatear fecha de desbloqueo
          const fechaDesbloqueo = new Date(timestampDesbloqueo * 1000);
          fechaFormateada = fechaDesbloqueo.toLocaleString("es-ES", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          });
        }

        const errorDetails: AuthBlockedDetails = {
          tiempoActualUTC: tiempoActual,
          timestampDesbloqueoUTC: timestampDesbloqueo,
          tiempoRestante: tiempoRestante,
          fechaDesbloqueo: fechaFormateada,
          esBloqueoPermanente: esBloqueoPermanente,
        };

        return res.status(403).json({
          success: false,
          message: esBloqueoPermanente
            ? "El acceso para directivos está permanentemente bloqueado"
            : "El acceso para directivos está temporalmente bloqueado",
          details: errorDetails,
        });
      }
    } catch (error) {
      console.error("Error al verificar bloqueo de rol:", error);
      // No bloqueamos el inicio de sesión por errores en la verificación
    }

    // Buscar el directivo por nombre de usuario
    const directivo = await prisma.t_Directivos.findUnique({
      where: {
        Nombre_Usuario: Nombre_Usuario,
      },
      select: {
        Id_Directivo: true,
        Nombre_Usuario: true,
        Contraseña: true,
        Nombres: true,
        Apellidos: true,
        Google_Drive_Foto_ID: true,
        Genero: true,
      },
    });

    // Si no existe el directivo o las credenciales son incorrectas, retornar error
    if (!directivo) {
      return res.status(401).json({
        success: false,
        message: "Credenciales inválidas",
      });
    }

    // Verificar la contraseña
    const isContraseñaValid = verifyDirectivoPassword(
      Contraseña,
      directivo.Contraseña
    );

    if (!isContraseñaValid) {
      return res.status(401).json({
        success: false,
        message: "Credenciales inválidas",
      });
    }

    // Generar token JWT
    const token = generateDirectivoToken(
      directivo.Id_Directivo,
      directivo.Nombre_Usuario
    );

    const response: ResponseSuccessLogin = {
      success: true,
      message: "Inicio de sesión exitoso",
      data: {
        Apellidos: directivo.Apellidos,
        Nombres: directivo.Nombres,
        Rol: RolesSistema.Directivo,
        token,
        Google_Drive_Foto_ID: directivo.Google_Drive_Foto_ID,
        Genero: directivo.Genero as Genero,
      },
    };

    // Responder con el token y datos básicos del usuario
    return res.status(200).json(response);
  } catch (error) {
    console.error("Error en inicio de sesión:", error);
    return res.status(500).json({
      success: false,
      message: "Error en el servidor, por favor intente más tarde",
    });
  }
}) as any);

export default router;
