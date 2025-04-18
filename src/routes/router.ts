// routes/index.ts
import { Router } from "express";

import { UserAuthenticatedAPI01 } from "../interfaces/shared/JWTPayload";
import AllErrorTypes from "../interfaces/shared/apis/errors";
import { ErrorDetails } from "../interfaces/shared/apis/errors/details";
import isDirectivoAuthenticated from "../middlewares/isDirectivoAuthenticated";
import checkAuthentication from "../middlewares/checkAuthentication";

import loginRouter from "./api/login";
import misDatosRouter from "./api/mis-datos";
import auxiliaresRouter from "./api/auxiliares";
import personalAdministrativoRouter from "./api/personal-administrativo";
import modificacionesTablasRouter from "./api/modificaciones-tablas";
import asistenciaRouter from "./api/asistencia";

import verifyGenericUserForAPI01 from "../middlewares/verifyGenericUserForAPI01";
import isAuxiliarAuthenticated from "../middlewares/isAuxiliarAuthenticated";
import isProfesorPrimariaAuthenticated from "../middlewares/isProfesorPrimariaAuthenticated";
import isProfesorSecundariaAuthenticated from "../middlewares/isProfesorSecundariaAuthenticated";
import isTutorAuthenticated from "../middlewares/isTutorAuthenticated";
import isPersonalAdministrativoAuthenticated from "../middlewares/isPersonalAdministrativoAuthenticated";
import decodedRol from "../middlewares/decodedRol";
import { RolesSistema } from "../interfaces/shared/RolesSistema";

const router = Router();

// Extender la interfaz Request de Express
declare global {
  namespace Express {
    interface Request {
      user?: UserAuthenticatedAPI01;
      isAuthenticated?: boolean;
      userRole?: RolesSistema;
      authError?: {
        type: AllErrorTypes;
        message: string;
        details?: ErrorDetails;
      };
    }
  }
}

router.use("/login", loginRouter);

router.use(
  "/mis-datos",
  decodedRol as any,
  isDirectivoAuthenticated,
  isProfesorPrimariaAuthenticated,
  isProfesorSecundariaAuthenticated,
  isTutorAuthenticated,
  isAuxiliarAuthenticated,
  isPersonalAdministrativoAuthenticated as any,
  // isResponsableAuthenticated,
  checkAuthentication as any,
  misDatosRouter
);

router.use(
  "/auxiliares",
  decodedRol as any,
  isDirectivoAuthenticated as any,
  checkAuthentication as any,
  auxiliaresRouter
);

router.use(
  "/personal-administrativo",
  isDirectivoAuthenticated as any,
  checkAuthentication as any,
  personalAdministrativoRouter
);

router.use(
  "/modificaciones-tablas",
  verifyGenericUserForAPI01 as any,
  modificacionesTablasRouter
);

router.use("/asistencia", decodedRol as any, asistenciaRouter);

export default router;
