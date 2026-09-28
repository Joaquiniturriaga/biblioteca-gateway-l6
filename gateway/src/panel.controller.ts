import {
  Body, Controller, Delete, ForbiddenException, Get, Headers, HttpException, Param,
  ParseIntPipe, Post, ServiceUnavailableException, UnauthorizedException,
} from '@nestjs/common';
import { verificar, tieneScope } from './auth/verificador';

const BFF_URL = process.env.BFF_URL!;

@Controller('v1/panel')
export class PanelController {
  private async verificarPermiso(authorization?: string): Promise<void> {
    let claims;
    try {
      claims = await verificar(authorization);
    } catch (e) {
      throw new UnauthorizedException((e as Error).message);
    }

    if (!tieneScope(claims, 'biblioteca/libros.leer')) {
      throw new ForbiddenException('te falta el permiso biblioteca/libros.leer');
    }
  }

  // tramo 11 (lo haces tu): un solo ayudante para los cuatro verbos, en vez del
  // `haciaElBff(ruta, authorization)` del tramo 8.1 que solo sabia hacer GET.
  private async haciaElBff(
    metodo: string,
    ruta: string,
    authorization?: string,
    cuerpo?: unknown,
  ): Promise<unknown> {
    await this.verificarPermiso(authorization);

    // El token sigue viaje. Sin esta cabecera, el BFF responde 401.
    let respuesta: Response;
    try {
      respuesta = await fetch(`${BFF_URL}${ruta}`, {
        method: metodo,
        headers: {
          authorization: authorization!,
          ...(cuerpo !== undefined ? { 'Content-Type': 'application/json' } : {}),
        },
        body: cuerpo !== undefined ? JSON.stringify(cuerpo) : undefined,
      });
    } catch {
      throw new ServiceUnavailableException('el BFF no responde');
    }

    // El codigo del BFF se respeta TAL CUAL: 400, 403, 404, 409 y 503 siguen siendo eso.
    const respuestaCuerpo: unknown = await respuesta.json();
    if (!respuesta.ok) {
      throw new HttpException(respuestaCuerpo as Record<string, unknown>, respuesta.status);
    }
    return respuestaCuerpo;
  }

  @Get()
  async panel(@Headers('authorization') authorization?: string) {
    return this.haciaElBff('GET', '/panel', authorization);
  }

  @Get('todos')
  async todos(@Headers('authorization') authorization?: string) {
    return this.haciaElBff('GET', '/panel/todos', authorization);
  }

  @Post('prestamos')
  async prestar(
    @Headers('authorization') authorization?: string,
    @Body() cuerpo?: { libroId?: unknown },
  ) {
    return this.haciaElBff('POST', '/panel/prestamos', authorization, cuerpo ?? {});
  }

  @Delete('prestamos/:id')
  async devolver(
    @Headers('authorization') authorization?: string,
    @Param('id', ParseIntPipe) id?: number,
  ) {
    return this.haciaElBff('DELETE', `/panel/prestamos/${id}`, authorization);
  }
}
