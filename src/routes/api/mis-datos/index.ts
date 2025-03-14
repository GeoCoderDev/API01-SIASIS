import { Request, Response, Router } from "express";
import { PrismaClient } from "@prisma/client";

import wereObligatoryQueryParamsReceived from "../../../middlewares/wereObligatoryQueryParamsReceived";
import { RolesSistema } from "../../../interfaces/RolesSistema";
import { AuthErrorTypes } from "../../../interfaces/errors/AuthErrorTypes";
import {
  AuxiliarAuthenticated,
  DirectivoAuthenticated,
  ProfesorPrimariaAuthenticated,
  ProfesorTutorSecundariaAuthenticated,
  ResponsableAuthenticated,
  PersonalAdministrativoAuthenticated,
} from "../../../interfaces/JWTPayload";
import { MisDatosSuccessAPI01 } from "../../../interfaces/SiasisAPIs";
import isDirectivoAuthenticated from "../../../middlewares/isDirectivoAuthenticated";
import isProfesorPrimariaAuthenticated from "../../../middlewares/isProfesorPrimariaAuthenticated";
import isProfesorSecundariaAuthenticated from "../../../middlewares/isProfesorSecundariaAuthenticated";
import isTutorAuthenticated from "../../../middlewares/isTutorAuthenticated";
import isAuxiliarAuthenticated from "../../../middlewares/isAuxiliarAuthenticated";
import isPersonalAdministrativoAuthenticated from "../../../middlewares/isPersonalAdministrativoAuthenticated";
import isResponsableAuthenticated from "../../../middlewares/isResponsableAuthenticated";
import checkAuthentication from "../../../middlewares/checkAuthentication";
import { RolesTexto } from "../../../../assets/RolesTextosEspañol";

const router = Router();
const prisma = new PrismaClient();

// Ruta para obtener los datos personales del usuario por rol
router.get(
  "/",
  wereObligatoryQueryParamsReceived(["Rol"]) as any,
  isDirectivoAuthenticated,
  isProfesorPrimariaAuthenticated,
  isProfesorSecundariaAuthenticated,
  isTutorAuthenticated,
  isAuxiliarAuthenticated,
  isPersonalAdministrativoAuthenticated as any,
  isResponsableAuthenticated,
  checkAuthentication as any,
  (async (req: Request, res: Response) => {
    try {
      const { Rol } = req.query as { Rol: RolesSistema };
      const userData = req.user!;

      // Buscar el usuario correspondiente según el rol
      let user: MisDatosSuccessAPI01 | null = null;

      if (req.userRole !== Rol) {
        req.authError = {
          type: AuthErrorTypes.TOKEN_WRONG_ROLE,
          message: `El token no corresponde a un ${RolesTexto[Rol].singular}`,
        };
        return res.status(403).json({
          success: false,
          message: req.authError.message,
          errorType: req.authError.type,
        });
      }

      switch (Rol) {
        case RolesSistema.Directivo:
          user = await prisma.t_Directivos.findUnique({
            where: {
              Id_Directivo: (userData as DirectivoAuthenticated).Id_Directivo,
            },
            select: {
              Id_Directivo: true,
              Nombres: true,
              Apellidos: true,
              Genero: true,
              DNI: true,
              Nombre_Usuario: true,
              Correo_Electronico: true,
              Celular: true,
              Google_Drive_Foto_ID: true,
            },
          });
          break;

        case RolesSistema.Auxiliar:
          user = await prisma.t_Auxiliares.findUnique({
            where: {
              DNI_Auxiliar: (userData as AuxiliarAuthenticated).DNI_Auxiliar,
            },
            select: {
              DNI_Auxiliar: true,
              Nombres: true,
              Apellidos: true,
              Genero: true,
              Nombre_Usuario: true,
              Estado: true,
              Correo_Electronico: true,
              Celular: true,
              Google_Drive_Foto_ID: true,
            },
          });
          break;

        case RolesSistema.ProfesorPrimaria:
          user = await prisma.t_Profesores_Primaria.findUnique({
            where: {
              DNI_Profesor_Primaria: (userData as ProfesorPrimariaAuthenticated)
                .DNI_Profesor_Primaria,
            },
            select: {
              DNI_Profesor_Primaria: true,
              Nombres: true,
              Apellidos: true,
              Genero: true,
              Nombre_Usuario: true,
              Estado: true,
              Correo_Electronico: true,
              Celular: true,
              Google_Drive_Foto_ID: true,
              // Incluir aula para profesores de primaria
              aulas: {
                select: {
                  Id_Aula: true,
                  Nivel: true,
                  Grado: true,
                  Seccion: true,
                  Color: true,
                },
              },
            },
          });
          break;

        case RolesSistema.ProfesorSecundaria:
          user = await prisma.t_Profesores_Secundaria.findUnique({
            where: {
              DNI_Profesor_Secundaria: (
                userData as ProfesorTutorSecundariaAuthenticated
              ).DNI_Profesor_Secundaria,
            },
            select: {
              DNI_Profesor_Secundaria: true,
              Nombres: true,
              Apellidos: true,
              Genero: true,
              Nombre_Usuario: true,
              Estado: true,
              Correo_Electronico: true,
              Celular: true,
              Google_Drive_Foto_ID: true,
            },
          });
          break;

        case RolesSistema.Tutor:
          user = await prisma.t_Profesores_Secundaria.findUnique({
            where: {
              DNI_Profesor_Secundaria: (
                userData as ProfesorTutorSecundariaAuthenticated
              ).DNI_Profesor_Secundaria,
            },
            select: {
              DNI_Profesor_Secundaria: true,
              Nombres: true,
              Apellidos: true,
              Genero: true,
              Nombre_Usuario: true,
              Estado: true,
              Correo_Electronico: true,
              Celular: true,
              Google_Drive_Foto_ID: true,
              // Incluir aula para tutores
              aulas: {
                select: {
                  Id_Aula: true,
                  Nivel: true,
                  Grado: true,
                  Seccion: true,
                  Color: true,
                },
              },
            },
          });
          break;

        case RolesSistema.Responsable:
          user = await prisma.t_Responsables.findUnique({
            where: {
              DNI_Responsable: (userData as ResponsableAuthenticated)
                .DNI_Responsable,
            },
            select: {
              DNI_Responsable: true,
              Nombres: true,
              Apellidos: true,
              Nombre_Usuario: true,
              Celular: true,
              Google_Drive_Foto_ID: true,
            },
          });
          break;

        case RolesSistema.PersonalAdministrativo:
          user = await prisma.t_Personal_Administrativo.findUnique({
            where: {
              DNI_Personal_Administrativo: (
                userData as PersonalAdministrativoAuthenticated
              ).DNI_Personal_Administrativo,
            },
            select: {
              DNI_Personal_Administrativo: true,
              Nombres: true,
              Apellidos: true,
              Genero: true,
              Nombre_Usuario: true,
              Estado: true,
              Celular: true,
              Google_Drive_Foto_ID: true,
              // Incluir horarios laborales para personal administrativo
              Horario_Laboral_Entrada: true,
              Horario_Laboral_Salida: true,
            },
          });

          // Formatear horarios para personal administrativo
          // if (user) {
          //   const formatearHora = (fecha: Date | null) => {
          //     if (!fecha) return null;
          //     return new Date(fecha).toLocaleTimeString("es-ES", {
          //       hour: "2-digit",
          //       minute: "2-digit",
          //     });
          //   };

          //   user.Horario_Laboral_Entrada_Formateada = formatearHora(
          //     user.Horario_Laboral_Entrada
          //   );
          //   user.Horario_Laboral_Salida_Formateada = formatearHora(
          //     user.Horario_Laboral_Salida
          //   );
          // }
          break;

        default:
          return res.status(400).json({
            success: false,
            message: "Rol no soportado",
            errorType: AuthErrorTypes.INVALID_PARAMETERS,
          });
      }

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "Usuario no encontrado",
          errorType: AuthErrorTypes.USER_NOT_FOUND,
        });
      }

      return res.status(200).json({
        success: true,
        data: user,
      });
    } catch (error) {
      console.error("Error al obtener datos del usuario:", error);
      return res.status(500).json({
        success: false,
        message: "Error al obtener los datos del usuario",
        errorType: AuthErrorTypes.UNKNOWN_ERROR,
        details: error,
      });
    }
  }) as any
);

export default router;
