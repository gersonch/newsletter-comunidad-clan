const emailTemplate = `
<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <title>Newsletter Comunidad Clan</title>
    <style>
      body {
        font-family: Arial, Helvetica, sans-serif;
        background: #f6f6f6;
        margin: 0;
        padding: 0;
      }
      .container {
        max-width: 600px;
        margin: 40px auto;
        background: #fff;
        border-radius: 8px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.07);
        padding: 32px;
      }
      h1 {
        color: #2d3748;
        margin-bottom: 16px;
      }
      p {
        color: #4a5568;
        line-height: 1.6;
      }
      .cta {
        display: inline-block;
        margin: 24px 0;
        padding: 12px 24px;
        background: #3182ce;
        color: #fff;
        border-radius: 4px;
        text-decoration: none;
        font-weight: bold;
      }
      .footer {
        margin-top: 32px;
        font-size: 12px;
        color: #a0aec0;
        text-align: center;
      }
      .unsubscribe {
        color: #e53e3e;
        text-decoration: underline;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <h1>¡Hola {{{FIRST_NAME|amigo}}}!</h1>
      <p>
        Te damos la bienvenida a la <strong>Comunidad Clan</strong>. Gracias por suscribirte a nuestro newsletter.<br>
        Aquí recibirás novedades, eventos y contenido exclusivo.
      </p>
      <a href="https://comunidadclan.cl" class="cta">Visita nuestra web</a>
      <p>
        Si deseas dejar de recibir estos correos, puedes <a class="unsubscribe" href="{{{RESEND_UNSUBSCRIBE_URL}}}">darte de baja aquí</a>.
      </p>
      <div class="footer">
        © 2025 Comunidad Clan. Todos los derechos reservados.
      </div>
    </div>
  </body>
</html>`;

export default emailTemplate;
