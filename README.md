# biblioteca-gateway-l6

El gateway del proyecto guía, **tal como queda al terminar L4**. Es el punto de partida de **L6**
para quien no llegó a terminar L4: forkea esto, agrégale tus valores, y arrancas L6 desde el mismo
lugar que el resto del curso.

Si ya tienes tu propio `L1-gateway` con L4 completo, **no necesitas este repositorio**: sigue con el
tuyo. Esto es solo para quien lo perdió o nunca le quedó andando.

## Qué es cada pieza

| Carpeta o archivo | Qué es | Puerto |
|---|---|---|
| `gateway/` | El API Gateway en NestJS. Verifica el token contra el JWKS de Cognito (L3 tramo 7) y responde **401** sin uno válido | **8080** |
| `servicios/libros.mjs` | Microservicio de libros. Sirve `datos/catalogo.json` | **3001** |
| `servicios/prestamos.mjs` | Microservicio de préstamos, **dueño del dato**: `GET` lista, `POST` crea, `DELETE` marca `devuelto: true` (L4 tramo 11.2) | **3002** |
| `sembrar.mts` + `datos/` | El seed de L4: arma el catálogo con Google Books y las sinopsis con un modelo de lenguaje (o `--respaldo`, sin conexión), y los dos JSON que produce |  |

Adentro de `gateway/src/`, tres controllers y el verificador:

| Archivo | Ruta que atiende | Qué exige |
|---|---|---|
| `libros.controller.ts` | `GET/POST /v1/libros` | token válido + scope `biblioteca/libros.leer` (o `.escribir` en el `POST`) |
| `prestamos.controller.ts` | `GET /v1/prestamos` | token válido + scope `biblioteca/libros.leer` + grupo `bibliotecarios` |
| `panel.controller.ts` | `GET/POST/DELETE /v1/panel...` | token válido + scope `biblioteca/libros.leer`; reenvía al BFF con la cabecera `Authorization` |
| `auth/verificador.ts` | — | `verificar()`, `tieneScope()`, `estaEnGrupo()`, contra el JWKS de tu user pool |

`probar.mjs` y `herramientas/token.mjs` vienen de L1 y ya no sirven: armaban un token de mentira que
el gateway de hoy rechaza con 401, que es lo correcto. No los uses para comprobar nada.

## Cómo usarlo

Necesitas **Node 24.15.0 o superior** y **npm 11** (`node -v`, `npm -v`).

**1 · Fork y clon.** Abre [github.com/Umbingelelo/biblioteca-gateway-l6](https://github.com/Umbingelelo/biblioteca-gateway-l6)
y aprieta **Fork**, arriba a la derecha. Después clona **tu** fork, parado en `$HOME/DSY1107`. Si ya
tienes una carpeta `L1-gateway` de antes, renómbrala primero a `L1-gateway-anterior`. Los mismos
comandos sirven en Windows (PowerShell), macOS y Linux, uno por línea:

```bash
cd $HOME/DSY1107
git clone https://github.com/TU_USUARIO/biblioteca-gateway-l6.git L1-gateway
cd L1-gateway/gateway
npm install
cd ..
```

Si clonaste `Umbingelelo/biblioteca-gateway-l6` sin forkear, lo vas a notar recién al hacer `git push`
(un 403). Se arregla sin volver a clonar: forkea y, parado en `L1-gateway`,
`git remote set-url origin https://github.com/TU_USUARIO/biblioteca-gateway-l6.git`.

**2 · Los dos `.env`.** Cada uno tiene su `.env.example` al lado: cópialo y rellénalo con **tu**
ficha, no con la de este README. Parado en `L1-gateway`, los mismos comandos sirven en los tres
sistemas:

```bash
cp .env.example .env
cp gateway/.env.example gateway/.env
```

- `.env` (la raíz): los dos `sub` —no los correos— de tus usuarios de Cognito (L4 tramo 2.5; también
  están en la consola de Cognito, *Users*, en la ficha de cada usuario, campo *sub*). Las
  dos API keys de L4 tramos 2.3 y 2.4 solo hacen falta si vas a sembrar sin `--respaldo`; si no las
  tienes, déjalas vacías.
- `gateway/.env`: `COGNITO_ISSUER` y `COGNITO_CLIENT_ID` de tu ficha de L3 (tramo 7.1), y
  `BFF_URL=http://localhost:3000` para cuando levantes tu `biblioteca-bff`.

**3 · Vuelve a sembrar los datos con TUS `sub`.** `datos/catalogo.json` y `datos/prestamos.json`
vienen en el repositorio, pero `datos/prestamos.json` trae `sub` de ejemplo, inventados para que el
repositorio compile solo: no son los de tu Cognito, así que tu `/v1/prestamos` te va a devolver una
lista que no es tuya hasta que la rehagas:

```bash
node --env-file=.env sembrar.mts --respaldo
```

Sin `--respaldo`, y con las dos API keys puestas, te arma el catálogo de verdad con Google Books y el
modelo de lenguaje — es el mismo comando de L4 tramo 2.7. Después de sembrar, `git status` marca los
dos JSON de `datos/` como modificados: es lo esperado, ahora traen tus `sub`.

## Cómo se comprueba

Es el mismo checklist del **"Antes de empezar" §1 de L6**: tres terminales, más una cuarta para los
`curl`.

| Terminal | Comando | Carpeta |
|---|---|---|
| 1 | `node servicios/libros.mjs` | `L1-gateway` |
| 2 | `node servicios/prestamos.mjs` | `L1-gateway` |
| 3 | `npm run start:dev` | `L1-gateway/gateway` |

**Windows (PowerShell) — en Linux y macOS, quita el `.exe`:**

```powershell
curl.exe -i http://localhost:3001/libros
curl.exe -i http://localhost:3002/prestamos
curl.exe -i http://localhost:8080/v1/libros
curl.exe -i -H "Authorization: Bearer holaquetal" http://localhost:8080/v1/libros
curl.exe -i -H "Authorization: Bearer <TOKEN_LECTOR>" http://localhost:8080/v1/libros
```

**Qué tienes que ver:** las dos primeras, **200** con tus libros y préstamos. La tercera, **401** —el
gateway es la puerta—. La cuarta, **401** otra vez: un token de mentira no pasa el JWKS, que es
exactamente lo que arregló L3. La quinta, **200** con tus libros: el gateway acepta un token de verdad
de tu user pool. Si da 401, revisa `COGNITO_ISSUER` y `COGNITO_CLIENT_ID` de `gateway/.env`, o el token
venció: duran una hora.

`<TOKEN_LECTOR>` es el access token de `lector@`, el del tramo 6 de L3. Si no tienes ese `token.mjs`,
sácalo del navegador: con `biblioteca-web` y `biblioteca-bff` corriendo, entra con ese usuario en
http://localhost:4200, aprieta *Ver mis prestamos*, abre F12 > *Network* > la petición `panel` >
*Request Headers* > `authorization`, y copia lo que va después de `Bearer `.

## Lo que este repositorio NO trae

Nada de L6: sin `amqplib`, sin `servicios/package.json`, sin `.env` de un broker, y el BFF no reenvía
todavía el `Authorization` a `prestamos.mjs` para publicar eventos. Eso es justamente lo que vas a
construir hoy.

## Si no tienes tu propio user pool de Cognito

Te faltan los tramos 1 al 5 de **L3, "Identidad real con Cognito"** (el laboratorio del curso, no un
archivo de este repositorio): ahí creas el user pool, el resource server, el app client, el grupo y
el usuario. Si prefieres la línea de comandos en vez de la consola, están todos en el **Anexo CLI** al
final de ese mismo laboratorio.
