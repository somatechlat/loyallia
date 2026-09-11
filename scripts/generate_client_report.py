"""
Generate REPORTE-CORRECCIONES-CLIENTE.docx — client review document with checkboxes.
"""
from docx import Document
from docx.shared import Pt, Cm, RGBColor, Inches
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml.ns import qn
from docx.oxml import OxmlElement

doc = Document()

for section in doc.sections:
    section.top_margin = Cm(2.0)
    section.bottom_margin = Cm(2.0)
    section.left_margin = Cm(2.0)
    section.right_margin = Cm(2.0)

style = doc.styles['Normal']
style.font.name = 'Calibri'
style.font.size = Pt(10)
style.font.color.rgb = RGBColor(0x1F, 0x1F, 0x1F)
style.paragraph_format.space_after = Pt(4)


def set_cell_shading(cell, color):
    shading = OxmlElement('w:shd')
    shading.set(qn('w:fill'), color)
    shading.set(qn('w:val'), 'clear')
    cell._tc.get_or_add_tcPr().append(shading)


def make_header_row(table, headers, color='1F3A5F'):
    for i, h in enumerate(headers):
        cell = table.rows[0].cells[i]
        cell.text = h
        for p in cell.paragraphs:
            for r in p.runs:
                r.font.bold = True
                r.font.size = Pt(9)
                r.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        set_cell_shading(cell, color)


def add_row(table, cells_data):
    row = table.add_row()
    for i, text in enumerate(cells_data):
        row.cells[i].text = str(text)
        for p in row.cells[i].paragraphs:
            for r in p.runs:
                r.font.size = Pt(9)
    return row


def section_table(doc):
    t = doc.add_table(rows=1, cols=5)
    t.style = 'Table Grid'
    t.alignment = WD_TABLE_ALIGNMENT.CENTER
    make_header_row(t, ['Revisado', '#', 'Requerimiento del Cliente', 'Estado', 'Verificacion / Donde se hizo'])
    for row in t.rows:
        row.cells[0].width = Cm(1.5)
        row.cells[1].width = Cm(1.0)
        row.cells[2].width = Cm(7.5)
        row.cells[3].width = Cm(2.0)
        row.cells[4].width = Cm(5.5)
    return t


# ==========================================================================
# TITLE
# ==========================================================================
p = doc.add_paragraph()
p.alignment = WD_ALIGN_PARAGRAPH.CENTER
r = p.add_run('REPORTE DE CORRECCIONES — EDICION LOYALLIA')
r.font.size = Pt(18)
r.font.bold = True
r.font.color.rgb = RGBColor(0x1F, 0x3A, 0x5F)

p = doc.add_paragraph()
p.alignment = WD_ALIGN_PARAGRAPH.CENTER
r = p.add_run('Documento de verificacion para el cliente')
r.font.size = Pt(11)
r.font.color.rgb = RGBColor(0x59, 0x59, 0x59)
r.font.italic = True

doc.add_paragraph()

# -- Meta table --
meta = doc.add_table(rows=5, cols=2)
meta.style = 'Table Grid'
meta.rows[0].cells[0].text = 'Fecha:'
meta.rows[0].cells[1].text = '11 de septiembre de 2026'
meta.rows[1].cells[0].text = 'Documento del cliente:'
meta.rows[1].cells[1].text = 'EDICION LOYALLIA.docx'
meta.rows[2].cells[0].text = 'URL Produccion:'
meta.rows[2].cells[1].text = 'https://rewards.loyallia.com'
meta.rows[3].cells[0].text = 'Estado general:'
meta.rows[3].cells[1].text = 'Todos los items implementados y verificados con 36 tests automatizados'
meta.rows[4].cells[0].text = 'Total de correcciones:'
meta.rows[4].cells[1].text = '27 requerimientos del cliente + 12 correcciones adicionales = 39 items'
for row in meta.rows:
    row.cells[0].paragraphs[0].runs[0].font.bold = True if row.cells[0].paragraphs[0].runs else None
    set_cell_shading(row.cells[0], 'E8EDF2')
    for cell in row.cells:
        for p in cell.paragraphs:
            for r in p.runs:
                r.font.size = Pt(9)

doc.add_paragraph()

p = doc.add_paragraph()
r = p.add_run('Instrucciones: ')
r.font.bold = True
r.font.size = Pt(9)
r = p.add_run('Marque la casilla "Revisado" de cada item una vez que haya verificado la correccion en la plataforma https://rewards.loyallia.com. Si encuentra algun problema, anotelo al reverso o en una nota adjunta.')
r.font.size = Pt(9)
r.font.color.rgb = RGBColor(0x59, 0x59, 0x59)

doc.add_paragraph()

# ==========================================================================
# 1. PROGRAMAS — MENU PRINCIPAL
# ==========================================================================
doc.add_heading('1. PROGRAMAS DE FIDELIZACION — Menu Principal', level=2)
t1 = section_table(doc)
add_row(t1, ['\u2610', '1.1', 'Donde dice DESCRIPCION, poner: "Crea, administra y consulta tus programas de fidelizacion" (en cursiva)', 'COMPLETADO', 'Pagina /programs — titulo con clase italic'])
add_row(t1, ['\u2610', '1.2', '"Crea tu primer programa de fidelizacion" cambiar a: "Crea tu primer programa y empieza a fidelizar a tus clientes"', 'COMPLETADO', 'Pagina /programs — texto vacio actualizado en es.json y en.json'])
doc.add_paragraph()

# ==========================================================================
# 2. BUG "ALGO SALIO MAL"
# ==========================================================================
doc.add_heading('2. BUG — "Algo salio mal" al dar clic en Ver o Editar', level=2)
t2 = section_table(doc)
add_row(t2, ['\u2610', '2.1', 'No funciona Ver ni editar, aparece "Algo salio mal"', 'COMPLETADO', 'Pagina /programs/{id} — fix en [id]/page.tsx: (1) useSearchParams lee ?tab=edit, (2) stats() en background, (3) getQrUrl con fallback'])
add_row(t2, ['\u2610', '2.2', 'Handler de publicar duplicado 3 veces', 'COMPLETADO', 'Pagina /programs/{id} — handlePublish() extraido con useCallback'])
doc.add_paragraph()

# ==========================================================================
# 3. TARJETA DE SELLOS — CONFIGURACION
# ==========================================================================
doc.add_heading('3. TARJETA DE SELLOS — Configuracion (Textos e Idioma)', level=2)
t3 = section_table(doc)
add_row(t3, ['\u2610', '3.1', 'Textos en espanol e ingles rotos — arreglar todos', 'COMPLETADO', '~50 keys corregidas en es.json y en.json'])
add_row(t3, ['\u2610', '3.2', 'TIPO DE SELLO — tooltip: "Elige la forma en que tus clientes acumularan sellos..."', 'COMPLETADO', 'es.json: stampTypeTooltip actualizado'])
add_row(t3, ['\u2610', '3.3', 'Modo visita — tooltip: "Cada vez que un cliente visite tu negocio..."', 'COMPLETADO', 'es.json: visitTooltip actualizado'])
add_row(t3, ['\u2610', '3.4', 'Modo visita — ejemplo: "1 visita = 1 sello"', 'COMPLETADO', 'es.json: visitExample actualizado'])
add_row(t3, ['\u2610', '3.5', 'Modo consumo — renombrar a "Modo otorgar sello por consumo"', 'COMPLETADO', 'es.json: consumptionMode actualizado'])
add_row(t3, ['\u2610', '3.6', 'Modo consumo — tooltip: "Define cuanto debe gastar un cliente para recibir 1 sello"', 'COMPLETADO', 'es.json: consumptionTooltip actualizado'])
add_row(t3, ['\u2610', '3.7', 'Modo consumo — ejemplo: "Por cada $5 de compra, el cliente recibe 1 sello"', 'COMPLETADO', 'es.json: consumptionExample actualizado'])
doc.add_paragraph()

# ==========================================================================
# 4. COMO GANAN SELLOS
# ==========================================================================
doc.add_heading('4. SECCION "COMO GANAN SELLOS TUS CLIENTES"', level=2)
t4 = section_table(doc)
add_row(t4, ['\u2610', '4.1', 'Renombrar "SELLOS REQUERIDOS" a "COMO GANAN SELLOS TUS CLIENTES"', 'COMPLETADO', 'es.json: stampsRequired actualizado'])
add_row(t4, ['\u2610', '4.2', 'Tooltip: "Configura cuantos sellos obtiene el cliente por 1 visita"', 'COMPLETADO', 'es.json: stampsRequiredTooltip actualizado'])
add_row(t4, ['\u2610', '4.3', 'Subtitulo en cursiva: "Ejemplo: 5 sellos por cada visita"', 'COMPLETADO', 'StampConfig.tsx — nuevo subtitulo con <p className="italic">'])
add_row(t4, ['\u2610', '4.4', 'Modo visita: "1 visita" fijo a la izquierda, sellos editables a la derecha', 'COMPLETADO', 'StampConfig.tsx — layout dos columnas con "1 visita" fijo'])
add_row(t4, ['\u2610', '4.5', 'Modo consumo: "$" + monto editable a la izquierda, "=" + sellos a la derecha', 'COMPLETADO', 'StampConfig.tsx — layout dos columnas con $ + input + = + input'])
add_row(t4, ['\u2610', '4.6', 'Subtitulo para consumo: "Ejemplo: 1 sello por cada $10 de consumo"', 'COMPLETADO', 'StampConfig.tsx + es.json: consumptionSubtitle'])
doc.add_paragraph()

# ==========================================================================
# 5. RECOMPENSA
# ==========================================================================
doc.add_heading('5. SECCION RECOMPENSA', level=2)
t5 = section_table(doc)
add_row(t5, ['\u2610', '5.1', 'Titulo: "Que recompensa recibira el cliente?"', 'COMPLETADO', 'es.json: rewardDescription actualizado'])
add_row(t5, ['\u2610', '5.2', 'Tooltip: "Define el beneficio que recibira el cliente al completar todos los sellos"', 'COMPLETADO', 'es.json: rewardDescriptionTooltip actualizado'])
add_row(t5, ['\u2610', '5.3', 'Placeholder: "Ejemplo: Cafe gratis, hamburguesa gratis, $10 de descuento"', 'COMPLETADO', 'es.json: rewardPlaceholder actualizado'])
add_row(t5, ['\u2610', '5.4', 'Tipo de recompensa — 3 opciones: Descuento en $, Descuento %, Recompensa', 'COMPLETADO', 'StampConfig.tsx — selector de 3 opciones con inputs condicionales'])
doc.add_paragraph()

# ==========================================================================
# 6. FORMULARIO
# ==========================================================================
doc.add_heading('6. FORMULARIO DE EMISION PARA CLIENTES', level=2)
t6 = section_table(doc)
add_row(t6, ['\u2610', '6.1', 'Titulo: "Formulario de emision para clientes"', 'COMPLETADO', 'es.json: formBuilder.title'])
add_row(t6, ['\u2610', '6.2', 'Tooltip: "Define los datos que quieres solicitar al cliente antes de anadir su tarjeta"', 'COMPLETADO', 'es.json: formBuilder.tooltip'])
add_row(t6, ['\u2610', '6.3', 'Tipos de campo: Texto, Correo electronico, Telefono, Fecha, Cedula', 'COMPLETADO', 'FormBuilder.tsx — 5 tipos verificados'])
add_row(t6, ['\u2610', '6.4', 'Eliminar campo "select" y su textarea de opciones', 'COMPLETADO', 'FormBuilder.tsx — select/number removidos'])
doc.add_paragraph()

# ==========================================================================
# 7. PREVIEW CSS
# ==========================================================================
doc.add_heading('7. PREVIEW DE WALLET — Correcciones CSS', level=2)
t7 = section_table(doc)
add_row(t7, ['\u2610', '7.1', 'Colores del usuario no se reflejan en el hover preview', 'COMPLETADO', 'WalletPreviewContent.tsx — lee walletDesign.colors'])
add_row(t7, ['\u2610', '7.2', 'Radio de tarjeta inconsistente', 'COMPLETADO', 'WalletPreviewContent.tsx — rounded-2xl consistente'])
add_row(t7, ['\u2610', '7.3', 'Logo dimensiones inconsistentes', 'COMPLETADO', 'WalletPreviewContent.tsx — w-[60px] h-[22px]'])
doc.add_paragraph()

# ==========================================================================
# 8. CORRECCIONES ADICIONALES
# ==========================================================================
doc.add_heading('8. CORRECCIONES ADICIONALES DEL SISTEMA', level=2)
p = doc.add_paragraph()
r = p.add_run('Correcciones encontradas durante la auditoria de calidad del sistema:')
r.font.size = Pt(9)
r.font.italic = True
r.font.color.rgb = RGBColor(0x59, 0x59, 0x59)

t8 = section_table(doc)
add_row(t8, ['\u2610', 'A1', 'Simbolo de moneda $ hardcoded en configuracion de sellos', 'COMPLETADO', 'StampConfig.tsx — reemplazado con t(wallet.studio.currency.symbol)'])
add_row(t8, ['\u2610', 'A2', 'Campos de reverso mostrados en tarjeta frontal', 'COMPLETADO', 'AppleWalletPreview.tsx — back fields removidos de vista frontal'])
add_row(t8, ['\u2610', 'A3', 'Labels de tipos de tarjeta sin internacionalizar', 'COMPLETADO', 'programs/new/page.tsx — usa CARD_TYPE_LABEL_KEYS con t()'])
add_row(t8, ['\u2610', 'A4', 'Pagina de detalle crasheaba por getQrUrl()', 'COMPLETADO', 'constants.ts — fallback con API gratuita en vez de excepcion'])
add_row(t8, ['\u2610', 'A5', 'Pagina de detalle crasheaba por getWhatsAppShareUrl()', 'COMPLETADO', 'constants.ts — fallback con wa.me en vez de excepcion'])
add_row(t8, ['\u2610', 'A6', 'Vault de secrets incompleto (39 de 52)', 'COMPLETADO', 'Re-sembrado completo desde .bootstrap_secrets.env'])
add_row(t8, ['\u2610', 'A7', 'Boton "Iniciar sesion con Google" no aparecia', 'COMPLETADO', 'google_oauth_client_id restaurado en Vault'])
add_row(t8, ['\u2610', 'A8', '5 textos hardcoded en pagina de diseno', 'COMPLETADO', 'design/page.tsx — reemplazados con claves i18n'])
add_row(t8, ['\u2610', 'A9', 'Simbolo de moneda $ hardcoded en selector de recompensa', 'COMPLETADO', 'StampConfig.tsx — reemplazado con t(wallet.studio.currency.symbol)'])
add_row(t8, ['\u2610', 'A10', 'Variable t sombreada en CARD_TYPES.find(t => ...)', 'COMPLETADO', 'programs/new/page.tsx — renombrado a ct'])
add_row(t8, ['\u2610', 'A11', 'Test E2E desactualizado (texto renombrado)', 'COMPLETADO', '02-programs.spec.ts — selector actualizado'])
add_row(t8, ['\u2610', 'A12', 'Texto "Campo obligatorio" en locale ingles', 'COMPLETADO', 'en.json — corregido a "Required"'])
doc.add_paragraph()

# ==========================================================================
# 9. VERIFICACION
# ==========================================================================
doc.add_heading('9. VERIFICACION AUTOMATIZADA', level=2)
p = doc.add_paragraph()
r = p.add_run('Tests ejecutados contra produccion (rewards.loyallia.com):')
r.font.size = Pt(9)

vt = doc.add_table(rows=7, cols=4)
vt.style = 'Table Grid'
vt.alignment = WD_TABLE_ALIGNMENT.CENTER
make_header_row(vt, ['Suite de Tests', 'Pasaron', 'Fallaron', 'Omitidos'])
data = [
    ('TypeScript (verificacion de tipos)', 'OK', '0', '-'),
    ('Tests Unitarios (Vitest)', '503', '0', '-'),
    ('Build de Produccion (Next.js)', 'OK', '-', '-'),
    ('E2E Suite 02 — Programas CRUD', '8', '0', '-'),
    ('E2E Suite 42 — Correcciones cliente', '29', '0', '2'),
    ('TOTAL', '540+', '0', '2'),
]
for i, row_data in enumerate(data):
    row = vt.rows[i + 1]
    for j, val in enumerate(row_data):
        row.cells[j].text = val
        for p in row.cells[j].paragraphs:
            for r in p.runs:
                r.font.size = Pt(9)
                if i == len(data) - 1:
                    r.font.bold = True
    if i == len(data) - 1:
        for cell in row.cells:
            set_cell_shading(cell, 'E8EDF2')

doc.add_paragraph()

# ==========================================================================
# 10. FIRMAS
# ==========================================================================
doc.add_heading('10. FIRMAS DE APROBACION', level=2)
st = doc.add_table(rows=3, cols=3)
st.style = 'Table Grid'
st.alignment = WD_TABLE_ALIGNMENT.CENTER
make_header_row(st, ['Rol', 'Nombre', 'Fecha y Firma'])
st.rows[1].cells[0].text = 'Cliente'
st.rows[2].cells[0].text = 'Equipo Tecnico LoyalIA'
for row in st.rows[1:]:
    for cell in row.cells:
        for p in cell.paragraphs:
            for r in p.runs:
                r.font.size = Pt(9)
        cell.height = Cm(1.5)

doc.add_paragraph()
p = doc.add_paragraph()
p.alignment = WD_ALIGN_PARAGRAPH.CENTER
r = p.add_run('Loyallia — Digital Loyalty Platform | rewards.loyallia.com')
r.font.size = Pt(8)
r.font.color.rgb = RGBColor(0x99, 0x99, 0x99)
r.font.italic = True

output = '/Users/macbookpro201916i964gb1tb/Documents/GitHub/loyallia/REPORTE-CORRECCIONES-CLIENTE.docx'
doc.save(output)
print(f'OK: {output}')
