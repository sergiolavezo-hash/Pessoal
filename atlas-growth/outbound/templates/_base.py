TOPO = """<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#05070a">
<tr><td align="center" style="padding:0">
<table width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;background-color:#0d1117">
  <tr><td height="3" style="height:3px;line-height:3px;font-size:0;background-color:#2e86ff">&nbsp;</td></tr>
  <tr><td style="padding:24px 40px 20px 40px;border-bottom:1px solid #1b222c">
    <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
      <td align="left" style="font-family:'Manrope','Segoe UI',Arial,Helvetica,sans-serif;font-size:17px;font-weight:800;letter-spacing:5px;color:#f4f3ef">ATLAS</td>
      <td align="right" style="font-family:'IBM Plex Mono',Consolas,'Courier New',monospace;font-size:9px;letter-spacing:2px;color:#767e8e;text-transform:uppercase">{etiqueta}</td>
    </tr></table>
  </td></tr>
  <tr><td style="padding:36px 40px 0 40px">
"""

def p(txt, cor="#9ba3ae", mb=16, tam=16, lh=26):
    return ('<p style="margin:0 0 %dpx 0;font-family:\'Inter\',\'Segoe UI\',Arial,'
            'Helvetica,sans-serif;font-size:%dpx;line-height:%dpx;color:%s">%s</p>\n'
            % (mb, tam, lh, cor, txt))

ASSINATURA = """  </td></tr>
  <tr><td style="padding:30px 40px 0 40px">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid #1b222c">
      <tr><td style="padding-top:22px">
        <p style="margin:0 0 4px 0;font-family:'Manrope','Segoe UI',Arial,Helvetica,sans-serif;font-size:17px;font-weight:800;letter-spacing:-0.3px;color:#ffffff;line-height:1.1">S&eacute;rgio Lavezo</p>
        <p style="margin:0 0 12px 0;font-family:'Manrope','Segoe UI',Arial,Helvetica,sans-serif;font-size:10px;font-weight:700;letter-spacing:2.5px;color:#2e86ff;text-transform:uppercase;line-height:1">Founder &amp; CEO &middot; Atlas Tecnologia</p>
        <p style="margin:0 0 5px 0;font-family:'Inter','Segoe UI',Arial,Helvetica,sans-serif;font-size:13px;line-height:18px;color:#b9c0c9">11 95498-1494</p>
        <p style="margin:0;font-family:'Inter','Segoe UI',Arial,Helvetica,sans-serif;font-size:13px;line-height:18px"><a href="https://atlas-partner.com/?utm_source=email&amp;utm_medium=followup" style="color:#6fd4ff">atlas-partner.com</a></p>
      </td></tr>
    </table>
  </td></tr>
  <tr><td style="padding:24px 40px 30px 40px">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid #1b222c">
      <tr><td style="padding-top:16px">
        <p style="margin:0;font-family:'Inter','Segoe UI',Arial,Helvetica,sans-serif;font-size:11px;line-height:17px;color:#5c6472">Se preferir n&atilde;o receber novos contatos, responda com &ldquo;remover&rdquo; e encerramos aqui &mdash; sem follow-up.</p>
      </td></tr>
    </table>
  </td></tr>
  <tr><td height="3" style="height:3px;line-height:3px;font-size:0;background-color:#121a24">&nbsp;</td></tr>
</table>
</td></tr>
</table>"""
