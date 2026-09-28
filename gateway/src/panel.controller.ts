import {
  Controller, ForbiddenException, Get, Headers, HttpException,
  ServiceUnavailableException, UnauthorizedException,
} from '@nestjs/common';
import { verificar, tieneScope } from './auth/verificador';

const BFF_URL = process.env.BFF_URL!;

@Controller('v1/panel')
export class PanelController {
  private async haciaElBff(ruta: string, authorization?: string): Promise<unknown> {
    let claims;
    try {
      claims = await verificar(authorization);
    } catch (e) {
      throw new UnauthorizedException((e as Error).message);
    }

    if (!tieneScope(claims, 'biblioteca/libros.leer')) {
      throw new ForbiddenException('te falta el permiso biblioteca/libros.leer');
    }

    // El token sigue viaje. Sin esta cabecera, el BFF responde 401.
    let respuesta: Response;
    try {
      respuesta = await fetch(`${BFF_URL}${ruta}`, {
        headers: { authorization: authorization! },
      });
    } catch {
      throw new ServiceUnavailableException('el BFF no responde');
    }

    // El codigo del BFF se respeta TAL CUAL: 403 sigue siendo 403, y 503 sigue siendo 503.
    const cuerpo: unknown = await respuesta.json();
    if (!respuesta.ok) {
      throw new HttpException(cuerpo as Record<string, unknown>, respuesta.status);
    }
    return cuerpo;
  }

  @Get()
  async panel(@Headers('authorization') authorization?: string) {
    return this.haciaElBff('/panel', authorization);
  }

  @Get('todos')
  async todos(@Headers('authorization') authorization?: string) {
    return this.haciaElBff('/panel/todos', authorization);
  }
}
