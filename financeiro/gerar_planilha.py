import sys
from datetime import date
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.worksheet.datavalidation import DataValidation
from openpyxl.formatting.rule import CellIsRule, FormulaRule
from openpyxl.chart import BarChart, PieChart, Reference
from openpyxl.utils import get_column_letter as L

OUT = sys.argv[1]
FIRST, LAST = 5, 504          # linhas de dados nas abas de lançamento
R = f"${FIRST}:$" + "{c}" + f"${LAST}"
def rng(sheet, col): return f"'{sheet}'!${col}${FIRST}:${col}${LAST}"

# ---------- estilos ----------
F = 'Arial'
DARK, GOLD, CREAM, GREY, LINE = '1C1713', 'D6A85F', 'FBF6EC', 'EFEBE4', 'D9D2C5'
f_title = Font(name=F, size=18, bold=True, color=DARK)
f_sub = Font(name=F, size=10, italic=True, color='7A6F62')
f_head = Font(name=F, size=10, bold=True, color=GOLD)
f_body = Font(name=F, size=10, color='222222')
f_auto = Font(name=F, size=10, color='555555')
f_bold = Font(name=F, size=10, bold=True, color='222222')
fill_head = PatternFill('solid', fgColor=DARK)
fill_auto = PatternFill('solid', fgColor=GREY)
fill_input = PatternFill('solid', fgColor='FFF3C4')
fill_cream = PatternFill('solid', fgColor=CREAM)
thin = Side(style='thin', color=LINE)
box = Border(left=thin, right=thin, top=thin, bottom=thin)
center = Alignment(horizontal='center', vertical='center', wrap_text=True)
left = Alignment(horizontal='left', vertical='center', wrap_text=True)

BRL = '"R$" #,##0.00;[Red]-"R$" #,##0.00;"-"'
DATE = 'dd/mm/yyyy'
PCT = '0.0%;-0.0%;"-"'
INT = '0;-0;"-"'

wb = Workbook()

def header(ws, title, sub, cols):
    """cols: list of (nome, largura, tipo) tipo in input|auto"""
    ws['A1'] = title; ws['A1'].font = f_title
    ws['A2'] = sub; ws['A2'].font = f_sub
    ws.row_dimensions[1].height = 30
    ws.row_dimensions[4].height = 32
    for i, (name, width, kind) in enumerate(cols, 1):
        c = ws.cell(row=4, column=i, value=name)
        c.font = f_head; c.fill = fill_head; c.alignment = center; c.border = box
        ws.column_dimensions[L(i)].width = width
    ws.freeze_panes = 'A5'
    ws.sheet_view.showGridLines = False

def style_rows(ws, cols, fmts):
    for r in range(FIRST, LAST + 1):
        for i, (name, width, kind) in enumerate(cols, 1):
            c = ws.cell(row=r, column=i)
            c.border = box
            c.font = f_auto if kind == 'auto' else f_body
            if kind == 'auto': c.fill = fill_auto
            c.alignment = left if fmts.get(i) is None else Alignment(vertical='center')
            if fmts.get(i): c.number_format = fmts[i]

def dv_list(ws, src, col, prompt=None):
    dv = DataValidation(type='list', formula1=src, allow_blank=True, showErrorMessage=False)
    if prompt: dv.promptTitle, dv.prompt, dv.showInputMessage = 'Dica', prompt, True
    ws.add_data_validation(dv)
    dv.add(f'{col}{FIRST}:{col}{LAST}')

def fill(ws, rows, start_col=1):
    for r, row in enumerate(rows, FIRST):
        for j, v in enumerate(row):
            if v is not None:
                ws.cell(row=r, column=start_col + j, value=v)

# =========================================================
# LISTAS (opções dos menus)
# =========================================================
listas = {
    'A': ('Tipos de evento', ['Casamento', 'Empresa', 'Aniversário', 'Chá revelação', 'Outro']),
    'B': ('Status do orçamento', ['Aguardando', 'Fechado', 'Recusado']),
    'C': ('Função do freelancer', ['Fotógrafo', 'Videomaker', 'Storymaker', 'Assistente', 'Editor', 'Drone', 'Outro']),
    'D': ('Categorias de gasto', ['Combustível / transporte', 'Alimentação', 'Aplicativos / software', 'Cursos', 'Anúncios / marketing', 'Manutenção', 'Acessórios', 'Impostos / taxas', 'Outro']),
    'E': ('Categorias de equipamento', ['Câmera', 'Celular', 'Lente', 'Estabilizador / gimbal', 'Áudio', 'Iluminação', 'Drone', 'Computador', 'Armazenamento', 'Outro']),
    'F': ('Como o cliente conheceu', ['Instagram', 'Indicação', 'Site', 'Google', 'WhatsApp', 'Evento', 'Outro']),
    'G': ('Situação do equipamento', ['Em uso', 'Vendido', 'Quebrado / perdido']),
    'H': ('Sim / Não', ['Sim', 'Não']),
    'I': ('Forma de pagamento', ['Pix', 'Dinheiro', 'Cartão de crédito', 'Cartão de débito', 'Parcelado', 'Boleto']),
}
LIST_LAST = 30
def lref(col): return f"=Listas!${col}$5:${col}${LIST_LAST}"

# =========================================================
# COMO USAR
# =========================================================
ws = wb.active; ws.title = 'Como usar'
ws.sheet_view.showGridLines = False
ws.column_dimensions['A'].width = 4; ws.column_dimensions['B'].width = 30; ws.column_dimensions['C'].width = 90
ws['B2'] = 'Controle Financeiro — Darzan Produções'; ws['B2'].font = f_title
ws['B3'] = 'Storymaker & Videomaker · Campinas e região'; ws['B3'].font = f_sub
guia = [
    ('COMO FUNCIONA', None),
    ('1. Você só anota', 'Preencha as abas de lançamento (Trabalhos, Orçamentos, Clientes, Freelancers, Gastos e Equipamentos). O Resumo e a Agenda se calculam sozinhos.'),
    ('2. Cores das colunas', 'Colunas BRANCAS = você digita. Colunas CINZAS = automáticas, não digite nelas. Célula AMARELA no Resumo = ano que você quer ver.'),
    ('3. Menus', 'Várias colunas têm uma setinha com opções (tipo de evento, status...). Para mudar as opções, edite a aba "Listas".'),
    ('4. Código do trabalho', 'Cada trabalho tem um código (T001, T002, T003...). Use o mesmo código em Freelancers e Gastos para o sistema saber de qual trabalho é cada gasto.'),
    ('5. Linhas de exemplo', 'As linhas marcadas com "EXEMPLO" servem só para você ver como funciona. Apague essas linhas (selecione e aperte Delete) antes de começar a usar de verdade.'),
    ('', None),
    ('O QUE ANOTAR EM CADA ABA', None),
    ('Resumo', 'Seu painel: ganho bruto, lucro, gastos com freelancer, taxa de fechamento de orçamentos, resultados por mês e por tipo de evento.'),
    ('Agenda', 'Lista automática dos próximos eventos, puxada da aba Trabalhos (só aparecem datas de hoje em diante).'),
    ('Trabalhos', 'Cada evento fechado: data, cliente, tipo, valor cobrado e quanto já recebeu. Freelancers, outros gastos e lucro são calculados.'),
    ('Orçamentos', 'TODO orçamento que você passar, fechando ou não. Mude o status para Fechado ou Recusado quando o cliente responder.'),
    ('Clientes', 'Contato dos clientes e como te conheceram. O total de trabalhos e quanto cada um já pagou são automáticos.'),
    ('Freelancers', 'Cada pagamento a freelancer, com o código do trabalho. Assim você vê quanto gastou com freela em cada trabalho.'),
    ('Gastos', 'Despesas do dia a dia: combustível, apps, cursos, anúncios... Se o gasto for de um trabalho específico, coloque o código dele.'),
    ('Equipamentos', 'Tudo que você comprou para trabalhar. O Resumo mostra quanto já investiu e quanto do investimento o lucro já pagou.'),
    ('Listas', 'As opções dos menus. Pode adicionar novas opções nas linhas vazias.'),
    ('', None),
    ('DICAS', None),
    ('Datas', 'Digite sempre no formato dia/mês/ano, por exemplo 14/03/2026.'),
    ('Valores', 'Digite só o número (ex: 2500 ou 2500,50). O "R$" aparece sozinho.'),
    ('Lucro', 'Lucro = ganho bruto − freelancers − outros gastos. Equipamentos ficam separados porque são investimento, não gasto do mês.'),
    ('Não apague', 'Não apague colunas nem as linhas de título. Para remover um lançamento, apague só o conteúdo da linha.'),
]
r = 5
for a, b in guia:
    ws.cell(row=r, column=2, value=a)
    if b is None:
        ws.cell(row=r, column=2).font = Font(name=F, size=11, bold=True, color=GOLD)
        if a: 
            for c in (2, 3): ws.cell(row=r, column=c).fill = fill_head
    else:
        ws.cell(row=r, column=2).font = f_bold
        ws.cell(row=r, column=3, value=b).font = f_body
        ws.cell(row=r, column=3).alignment = left
        ws.row_dimensions[r].height = 30
    r += 1

# =========================================================
# TRABALHOS
# =========================================================
T = 'Trabalhos'
tw = wb.create_sheet(T)
tcols = [('Código', 10, 'input'), ('Data do evento', 14, 'input'), ('Horário', 10, 'input'),
         ('Cliente', 26, 'input'), ('Tipo de evento', 16, 'input'), ('Local / cidade', 22, 'input'),
         ('Valor cobrado', 15, 'input'), ('Valor recebido', 15, 'input'), ('A receber', 14, 'auto'),
         ('Freelancers', 14, 'auto'), ('Outros gastos', 14, 'auto'), ('Lucro', 14, 'auto'),
         ('Pagamento', 12, 'auto'), ('Observações', 30, 'input'), ('Ordem agenda', 9, 'auto')]
header(tw, 'Trabalhos fechados', 'Um evento por linha. Colunas cinzas são automáticas. Use T001, T002, T003... no código.', tcols)
style_rows(tw, tcols, {2: DATE, 3: 'hh:mm', 7: BRL, 8: BRL, 9: BRL, 10: BRL, 11: BRL, 12: BRL, 15: INT})
for r in range(FIRST, LAST + 1):
    tw[f'I{r}'] = f'=IF(G{r}="","",G{r}-H{r})'
    tw[f'J{r}'] = f'=IF(A{r}="","",SUMIFS(Freelancers!$E${FIRST}:$E${LAST},Freelancers!$B${FIRST}:$B${LAST},A{r}))'
    tw[f'K{r}'] = f'=IF(A{r}="","",SUMIFS(Gastos!$D${FIRST}:$D${LAST},Gastos!$E${FIRST}:$E${LAST},A{r}))'
    tw[f'L{r}'] = f'=IF(G{r}="","",G{r}-N(J{r})-N(K{r}))'
    tw[f'M{r}'] = f'=IF(G{r}="","",IF(H{r}>=G{r},"Pago",IF(H{r}>0,"Parcial","Pendente")))'
    tw[f'O{r}'] = (f'=IF(OR(B{r}="",B{r}<TODAY()),"",COUNTIFS($B${FIRST}:$B${LAST},">="&TODAY(),$B${FIRST}:$B${LAST},"<"&B{r})'
                   f'+COUNTIFS($B${FIRST}:B{r},B{r}))')
tw.column_dimensions['O'].hidden = True
dv_list(tw, lref('A'), 'E')
dv_list(tw, f"=Clientes!$A${FIRST}:$A${LAST}", 'D', 'Escolha um cliente da aba Clientes ou digite o nome.')
tw.conditional_formatting.add(f'M{FIRST}:M{LAST}', CellIsRule(operator='equal', formula=['"Pago"'], fill=PatternFill('solid', fgColor='D7F0DD'), font=Font(name=F, color='1E7B34', bold=True)))
tw.conditional_formatting.add(f'M{FIRST}:M{LAST}', CellIsRule(operator='equal', formula=['"Parcial"'], fill=PatternFill('solid', fgColor='FFF0C2'), font=Font(name=F, color='8A6100', bold=True)))
tw.conditional_formatting.add(f'M{FIRST}:M{LAST}', CellIsRule(operator='equal', formula=['"Pendente"'], fill=PatternFill('solid', fgColor='FBDADA'), font=Font(name=F, color='A12828', bold=True)))
fill(tw, [
    ['T001', date(2026, 3, 14), '16:00', 'Cliente Exemplo 1', 'Casamento', 'Campinas', 3500, 3500, None, None, None, None, None, 'EXEMPLO — apague esta linha'],
    ['T002', date(2026, 6, 20), '19:00', 'Empresa Exemplo', 'Empresa', 'Valinhos', 1800, 1800, None, None, None, None, None, 'EXEMPLO — apague esta linha'],
    ['T003', date(2026, 8, 9), '15:00', 'Cliente Exemplo 2', 'Chá revelação', 'Campinas', 900, 900, None, None, None, None, None, 'EXEMPLO — apague esta linha'],
    ['T004', date(2026, 11, 21), '20:00', 'Cliente Exemplo 3', 'Aniversário', 'Hortolândia', 1200, 600, None, None, None, None, None, 'EXEMPLO — apague esta linha'],
    ['T005', date(2026, 12, 5), '17:00', 'Cliente Exemplo 4', 'Casamento', 'Indaiatuba', 4200, 2100, None, None, None, None, None, 'EXEMPLO — apague esta linha'],
])
for r in range(FIRST, FIRST + 5):  # horário como hora de verdade
    h, m = tw[f'C{r}'].value.split(':'); from datetime import time; tw[f'C{r}'] = time(int(h), int(m))

# =========================================================
# ORÇAMENTOS
# =========================================================
ow = wb.create_sheet('Orçamentos')
ocols = [('Data do envio', 14, 'input'), ('Cliente', 26, 'input'), ('Tipo de evento', 16, 'input'),
         ('Data do evento', 14, 'input'), ('Valor orçado', 15, 'input'), ('Status', 13, 'input'), ('Observações', 40, 'input')]
header(ow, 'Orçamentos passados', 'Anote TODOS os orçamentos, fechando ou não. É isso que mostra a sua taxa de fechamento.', ocols)
style_rows(ow, ocols, {1: DATE, 4: DATE, 5: BRL})
dv_list(ow, lref('A'), 'C'); dv_list(ow, lref('B'), 'F')
dv_list(ow, f"=Clientes!$A${FIRST}:$A${LAST}", 'B', 'Escolha um cliente da aba Clientes ou digite o nome.')
for val, bg, fg in [('Fechado', 'D7F0DD', '1E7B34'), ('Aguardando', 'FFF0C2', '8A6100'), ('Recusado', 'FBDADA', 'A12828')]:
    ow.conditional_formatting.add(f'F{FIRST}:F{LAST}', CellIsRule(operator='equal', formula=[f'"{val}"'], fill=PatternFill('solid', fgColor=bg), font=Font(name=F, color=fg, bold=True)))
EX = 'EXEMPLO — apague esta linha'
fill(ow, [
    [date(2026, 1, 20), 'Cliente Exemplo 1', 'Casamento', date(2026, 3, 14), 3500, 'Fechado', EX],
    [date(2026, 2, 3), 'Cliente Exemplo 5', 'Casamento', date(2026, 5, 9), 3800, 'Recusado', EX + ' (achou caro)'],
    [date(2026, 5, 12), 'Empresa Exemplo', 'Empresa', date(2026, 6, 20), 1800, 'Fechado', EX],
    [date(2026, 6, 28), 'Cliente Exemplo 2', 'Chá revelação', date(2026, 8, 9), 900, 'Fechado', EX],
    [date(2026, 7, 15), 'Cliente Exemplo 6', 'Aniversário', date(2026, 9, 12), 1100, 'Recusado', EX + ' (data ocupada)'],
    [date(2026, 8, 30), 'Cliente Exemplo 3', 'Aniversário', date(2026, 11, 21), 1200, 'Fechado', EX],
    [date(2026, 9, 10), 'Cliente Exemplo 4', 'Casamento', date(2026, 12, 5), 4200, 'Fechado', EX],
    [date(2026, 10, 2), 'Cliente Exemplo 7', 'Chá revelação', date(2027, 1, 16), 950, 'Aguardando', EX],
])

# =========================================================
# CLIENTES
# =========================================================
cw = wb.create_sheet('Clientes')
ccols = [('Nome', 26, 'input'), ('WhatsApp', 16, 'input'), ('Instagram', 18, 'input'), ('Cidade', 16, 'input'),
         ('Como conheceu', 16, 'input'), ('Trabalhos', 11, 'auto'), ('Total já cobrado', 16, 'auto'), ('Observações', 34, 'input')]
header(cw, 'Clientes', 'Um cliente por linha. Use o MESMO nome nas abas Trabalhos e Orçamentos.', ccols)
style_rows(cw, ccols, {6: INT, 7: BRL})
for r in range(FIRST, LAST + 1):
    cw[f'F{r}'] = f'=IF(A{r}="","",COUNTIF({rng(T,"D")},A{r}))'
    cw[f'G{r}'] = f'=IF(A{r}="","",SUMIFS({rng(T,"G")},{rng(T,"D")},A{r}))'
dv_list(cw, lref('F'), 'E')
fill(cw, [
    ['Cliente Exemplo 1', '(19) 90000-0001', '@exemplo1', 'Campinas', 'Instagram', None, None, EX],
    ['Empresa Exemplo', '(19) 90000-0002', '@empresaexemplo', 'Valinhos', 'Indicação', None, None, EX],
    ['Cliente Exemplo 2', '(19) 90000-0003', '@exemplo2', 'Campinas', 'Instagram', None, None, EX],
    ['Cliente Exemplo 3', '(19) 90000-0004', '@exemplo3', 'Hortolândia', 'Site', None, None, EX],
    ['Cliente Exemplo 4', '(19) 90000-0005', '@exemplo4', 'Indaiatuba', 'Indicação', None, None, EX],
])

# =========================================================
# FREELANCERS
# =========================================================
fw = wb.create_sheet('Freelancers')
fcols = [('Data', 14, 'input'), ('Código do trabalho', 14, 'input'), ('Nome do freelancer', 24, 'input'),
         ('Função', 15, 'input'), ('Valor pago', 15, 'input'), ('Já pago?', 10, 'input'), ('Observações', 34, 'input')]
header(fw, 'Pagamentos a freelancers', 'Um pagamento por linha. O código do trabalho liga o gasto ao evento (T001, T002...).', fcols)
style_rows(fw, fcols, {1: DATE, 5: BRL})
dv_list(fw, f"={rng(T,'A')}", 'B', 'Escolha o código do trabalho (aba Trabalhos).')
dv_list(fw, lref('C'), 'D'); dv_list(fw, lref('H'), 'F')
fill(fw, [
    [date(2026, 3, 14), 'T001', 'Freela Exemplo A', 'Fotógrafo', 450, 'Sim', EX],
    [date(2026, 3, 14), 'T001', 'Freela Exemplo B', 'Assistente', 200, 'Sim', EX],
    [date(2026, 6, 20), 'T002', 'Freela Exemplo C', 'Editor', 250, 'Sim', EX],
    [date(2026, 12, 5), 'T005', 'Freela Exemplo B', 'Assistente', 250, 'Não', EX],
])

# =========================================================
# GASTOS
# =========================================================
gw = wb.create_sheet('Gastos')
gcols = [('Data', 14, 'input'), ('Categoria', 24, 'input'), ('Descrição', 30, 'input'), ('Valor', 15, 'input'),
         ('Código do trabalho (opcional)', 16, 'input'), ('Observações', 34, 'input')]
header(gw, 'Outros gastos', 'Despesas do negócio. Se for de um trabalho específico, coloque o código dele.', gcols)
style_rows(gw, gcols, {1: DATE, 4: BRL})
dv_list(gw, lref('D'), 'B')
dv_list(gw, f"={rng(T,'A')}", 'E', 'Opcional: código do trabalho (aba Trabalhos).')
fill(gw, [
    [date(2026, 3, 14), 'Combustível / transporte', 'Gasolina ida e volta', 80, 'T001', EX],
    [date(2026, 4, 1), 'Aplicativos / software', 'Assinatura app de edição', 60, None, EX],
    [date(2026, 7, 10), 'Anúncios / marketing', 'Impulsionamento Instagram', 150, None, EX],
    [date(2026, 8, 9), 'Alimentação', 'Lanche no evento', 40, 'T003', EX],
])

# =========================================================
# EQUIPAMENTOS
# =========================================================
ew = wb.create_sheet('Equipamentos')
ecols = [('Equipamento', 28, 'input'), ('Categoria', 20, 'input'), ('Data da compra', 14, 'input'), ('Valor pago', 15, 'input'),
         ('Forma de pagamento', 18, 'input'), ('Situação', 16, 'input'), ('Observações', 34, 'input')]
header(ew, 'Equipamentos (investimentos)', 'Tudo o que você comprou para trabalhar.', ecols)
style_rows(ew, ecols, {3: DATE, 4: BRL})
dv_list(ew, lref('E'), 'B'); dv_list(ew, lref('I'), 'E'); dv_list(ew, lref('G'), 'F')
fill(ew, [
    ['Celular (exemplo)', 'Celular', date(2025, 11, 10), 7000, 'Parcelado', 'Em uso', EX],
    ['Gimbal (exemplo)', 'Estabilizador / gimbal', date(2025, 11, 10), 900, 'Pix', 'Em uso', EX],
    ['Microfone sem fio (exemplo)', 'Áudio', date(2026, 2, 5), 650, 'Cartão de crédito', 'Em uso', EX],
    ['Luz LED (exemplo)', 'Iluminação', date(2026, 5, 18), 350, 'Pix', 'Em uso', EX],
])

# =========================================================
# AGENDA (automática)
# =========================================================
aw = wb.create_sheet('Agenda', 1)
acols = [('#', 5, 'auto'), ('Data', 14, 'auto'), ('Faltam (dias)', 12, 'auto'), ('Horário', 10, 'auto'), ('Cliente', 26, 'auto'),
         ('Tipo de evento', 16, 'auto'), ('Local / cidade', 22, 'auto'), ('Código', 10, 'auto'), ('A receber', 14, 'auto')]
header(aw, 'Agenda — próximos eventos', 'Automática: puxa da aba Trabalhos todos os eventos de hoje em diante, em ordem de data.', acols)
N_AG = 40
for k in range(1, N_AG + 1):
    r = FIRST + k - 1
    aw[f'A{r}'] = k
    m = f'MATCH($A{r},{rng(T,"O")},0)'
    def pull(col): return f'=IFERROR(INDEX({rng(T,col)},{m}),"")'
    aw[f'B{r}'] = pull('B'); aw[f'D{r}'] = pull('C'); aw[f'E{r}'] = pull('D'); aw[f'F{r}'] = pull('E')
    aw[f'G{r}'] = pull('F'); aw[f'H{r}'] = pull('A'); aw[f'I{r}'] = pull('I')
    aw[f'C{r}'] = f'=IF(B{r}="","",B{r}-TODAY())'
    for i, (n, w, kind) in enumerate(acols, 1):
        c = aw.cell(row=r, column=i); c.border = box; c.font = f_body; c.alignment = Alignment(vertical='center')
    aw[f'B{r}'].number_format = DATE; aw[f'D{r}'].number_format = 'hh:mm'; aw[f'I{r}'].number_format = BRL
    aw[f'C{r}'].number_format = '0'; aw[f'A{r}'].font = f_auto
aw.conditional_formatting.add(f'A{FIRST}:I{FIRST+N_AG-1}', FormulaRule(formula=[f'AND($C{FIRST}<>"",$C{FIRST}<=7)'], fill=PatternFill('solid', fgColor='FFF0C2')))
aw.conditional_formatting.add(f'A{FIRST}:I{FIRST+N_AG-1}', FormulaRule(formula=[f'$B{FIRST}=""'], font=Font(color='FFFFFF')))
aw[f'A{FIRST+N_AG+1}'] = 'Linhas em amarelo = evento nos próximos 7 dias.'; aw[f'A{FIRST+N_AG+1}'].font = f_sub

# =========================================================
# RESUMO (painel)
# =========================================================
sw = wb.create_sheet('Resumo', 1)
sw.sheet_view.showGridLines = False
widths = {'A': 3, 'B': 34, 'C': 18, 'D': 18, 'E': 3, 'F': 16, 'G': 15, 'H': 15, 'I': 15, 'J': 15, 'K': 13, 'L': 13, 'M': 12}
for k, v in widths.items(): sw.column_dimensions[k].width = v
sw['B1'] = 'Painel financeiro — Darzan Produções'; sw['B1'].font = f_title; sw.row_dimensions[1].height = 30
sw['B2'] = 'Tudo aqui é automático. Só troque o ano na célula amarela.'; sw['B2'].font = f_sub
sw['B4'] = 'Ano que você quer ver:'; sw['B4'].font = f_bold; sw['B4'].alignment = Alignment(horizontal='right')
sw['C4'] = 2026; sw['C4'].fill = fill_input; sw['C4'].font = Font(name=F, size=12, bold=True, color='0000FF'); sw['C4'].alignment = center; sw['C4'].border = box
ANO = '$C$4'
Y0, Y1 = f'DATE({ANO},1,1)', f'DATE({ANO}+1,1,1)'

def yr(sheet, sumcol, datecol, extra=''):
    return f'SUMIFS({rng(sheet,sumcol)},{rng(sheet,datecol)},">="&{Y0},{rng(sheet,datecol)},"<"&{Y1}{extra})'
def cnt_yr(sheet, datecol, extra=''):
    return f'COUNTIFS({rng(sheet,datecol)},">="&{Y0},{rng(sheet,datecol)},"<"&{Y1}{extra})'

def head_row(r, labels, start=2):
    for i, t in enumerate(labels):
        c = sw.cell(row=r, column=start + i, value=t)
        c.font = f_head; c.fill = fill_head; c.alignment = center; c.border = box
    sw.row_dimensions[r].height = 28

# ---- Indicadores ----
head_row(6, ['Indicador', 'No ano escolhido', 'Desde o início'])
O = 'Orçamentos'
ok = f',{rng(O,"F")},"Fechado"'
kpis = [
    ('Ganho bruto (valor cobrado)', '=' + yr(T, 'G', 'B'), f'=SUM({rng(T,"G")})', BRL),
    ('Já recebido', '=' + yr(T, 'H', 'B'), f'=SUM({rng(T,"H")})', BRL),
    ('A receber', '=C7-C8', '=D7-D8', BRL),
    ('Gastos com freelancers', '=' + yr('Freelancers', 'E', 'A'), f'=SUM({rng("Freelancers","E")})', BRL),
    ('Outros gastos', '=' + yr('Gastos', 'D', 'A'), f'=SUM({rng("Gastos","D")})', BRL),
    ('LUCRO (bruto − freelas − gastos)', '=C7-C10-C11', '=D7-D10-D11', BRL),
    ('Margem de lucro', '=IF(C7=0,0,C12/C7)', '=IF(D7=0,0,D12/D7)', PCT),
    ('Trabalhos fechados', '=' + cnt_yr(T, 'B'), f'=COUNT({rng(T,"B")})', INT),
    ('Valor médio por trabalho', '=IF(C14=0,0,C7/C14)', '=IF(D14=0,0,D7/D14)', BRL),
    ('Orçamentos passados', '=' + cnt_yr(O, 'A'), f'=COUNT({rng(O,"A")})', INT),
    ('Orçamentos fechados', '=' + cnt_yr(O, 'A', ok), f'=COUNTIF({rng(O,"F")},"Fechado")', INT),
    ('Taxa de fechamento', '=IF(C16=0,0,C17/C16)', '=IF(D16=0,0,D17/D16)', PCT),
    ('Orçamentos aguardando resposta', '=' + cnt_yr(O, 'A', f',{rng(O,"F")},"Aguardando"'), f'=COUNTIF({rng(O,"F")},"Aguardando")', INT),
    ('Investido em equipamentos', '=' + yr('Equipamentos', 'D', 'C'), f'=SUM({rng("Equipamentos","D")})', BRL),
    ('Equipamentos já pagos pelo lucro', '', '=IF(D20=0,0,MAX(0,D12)/D20)', PCT),
    ('Clientes cadastrados', '', f'=COUNTA({rng("Clientes","A")})', INT),
]
for i, (label, ano, total, fmt) in enumerate(kpis):
    r = 7 + i
    sw.cell(row=r, column=2, value=label)
    sw.cell(row=r, column=3, value=ano if ano else '—')
    sw.cell(row=r, column=4, value=total)
    for c in (2, 3, 4):
        cell = sw.cell(row=r, column=c); cell.border = box; cell.font = f_body
        cell.alignment = Alignment(vertical='center', horizontal='left' if c == 2 else 'right')
        if c > 2: cell.number_format = fmt
    sw.row_dimensions[r].height = 20
for c in (2, 3, 4):  # destaque no lucro
    cell = sw.cell(row=12, column=c); cell.font = Font(name=F, size=11, bold=True, color=DARK); cell.fill = PatternFill('solid', fgColor='F6E7C8')
nr = 7 + len(kpis) + 1
sw.cell(row=nr, column=2, value='"Equipamentos já pagos pelo lucro" = quanto do valor investido em equipamentos o seu lucro total já cobriu (100% = já se pagaram).').font = f_sub
sw.merge_cells(start_row=nr, start_column=2, end_row=nr + 1, end_column=4)
sw.cell(row=nr, column=2).alignment = Alignment(wrap_text=True, vertical='top')

# ---- Mês a mês ----
MR = 6
head_row(MR, ['Mês', 'Ganho bruto', 'Freelancers', 'Outros gastos', 'Lucro', 'Trabalhos', 'Orçam. passados', 'Orçam. fechados'], start=6)
meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
def mo(sheet, col, datecol, m, count=False, extra=''):
    a, b = f'DATE({ANO},{m},1)', f'DATE({ANO},{m}+1,1)'
    if count: return f'=COUNTIFS({rng(sheet,datecol)},">="&{a},{rng(sheet,datecol)},"<"&{b}{extra})'
    return f'=SUMIFS({rng(sheet,col)},{rng(sheet,datecol)},">="&{a},{rng(sheet,datecol)},"<"&{b})'
for m in range(1, 13):
    r = MR + m
    sw[f'F{r}'] = meses[m - 1]
    sw[f'G{r}'] = mo(T, 'G', 'B', m)
    sw[f'H{r}'] = mo('Freelancers', 'E', 'A', m)
    sw[f'I{r}'] = mo('Gastos', 'D', 'A', m)
    sw[f'J{r}'] = f'=G{r}-H{r}-I{r}'
    sw[f'K{r}'] = mo(T, None, 'B', m, count=True)
    sw[f'L{r}'] = mo(O, None, 'A', m, count=True)
    sw[f'M{r}'] = mo(O, None, 'A', m, count=True, extra=ok)
TR = MR + 13
sw[f'F{TR}'] = 'TOTAL'
for col in 'GHIJKLM':
    sw[f'{col}{TR}'] = f'=SUM({col}{MR+1}:{col}{MR+12})'
for r in range(MR + 1, TR + 1):
    for col in 'FGHIJKLM':
        c = sw[f'{col}{r}']; c.border = box; c.font = f_bold if r == TR else f_body
        c.number_format = BRL if col in 'GHIJ' else INT
        if r == TR: c.fill = PatternFill('solid', fgColor='F6E7C8')

# ---- Por tipo de evento ----
PR = 27
sw[f'B{PR-1}'] = 'Resultado por tipo de evento (ano escolhido)'; sw[f'B{PR-1}'].font = Font(name=F, size=12, bold=True, color=DARK)
head_row(PR, ['Tipo de evento', 'Trabalhos', 'Ganho bruto', '', 'Freelancers', 'Lucro', 'Valor médio', 'Orçam. passados', 'Taxa fecham.'])
sw.cell(row=PR, column=5).fill = PatternFill(fill_type=None)
n_tipos = 5
for i in range(n_tipos):
    r = PR + 1 + i
    sw[f'B{r}'] = f'=Listas!$A${5+i}'
    t = f',{rng(T,"E")},$B{r}'
    sw[f'C{r}'] = '=' + cnt_yr(T, 'B', t)
    sw[f'D{r}'] = '=' + yr(T, 'G', 'B', t)
    sw[f'F{r}'] = '=' + yr(T, 'J', 'B', t)
    sw[f'G{r}'] = '=' + yr(T, 'L', 'B', t)
    sw[f'H{r}'] = f'=IF(C{r}=0,0,D{r}/C{r})'
    sw[f'I{r}'] = '=' + cnt_yr(O, 'A', f',{rng(O,"C")},$B{r}')
    sw[f'J{r}'] = f'=IF(I{r}=0,0,' + cnt_yr(O, 'A', f',{rng(O,"C")},$B{r}' + ok) + f'/I{r})'
    for col, fmt in zip('BCDFGHIJ', [None, INT, BRL, BRL, BRL, BRL, INT, PCT]):
        c = sw[f'{col}{r}']; c.border = box; c.font = f_body
        if fmt: c.number_format = fmt
sw[f'B{PR+n_tipos+1}'] = 'Lucro por tipo = valor cobrado − freelancers − gastos ligados ao trabalho (pelo código).'; sw[f'B{PR+n_tipos+1}'].font = f_sub

# ---- De onde vêm os clientes ----
CR = 36
sw['B45'] = 'Gráficos (ano escolhido)'; sw['B45'].font = Font(name=F, size=12, bold=True, color=DARK)
sw[f'B{CR-1}'] = 'De onde vêm seus clientes'; sw[f'B{CR-1}'].font = Font(name=F, size=12, bold=True, color=DARK)
head_row(CR, ['Como conheceu', 'Clientes', 'Total cobrado'])
for i in range(7):
    r = CR + 1 + i
    sw[f'B{r}'] = f'=Listas!$F${5+i}'
    sw[f'C{r}'] = f'=COUNTIF({rng("Clientes","E")},$B{r})'
    sw[f'D{r}'] = f'=SUMIFS({rng("Clientes","G")},{rng("Clientes","E")},$B{r})'
    for col, fmt in zip('BCD', [None, INT, BRL]):
        c = sw[f'{col}{r}']; c.border = box; c.font = f_body
        if fmt: c.number_format = fmt

# ---- Gráficos ----
ch = BarChart(); ch.type = 'col'; ch.title = 'Ganho bruto x Lucro por mês'; ch.y_axis.title = 'R$'
ch.add_data(Reference(sw, min_col=7, min_row=MR, max_row=MR + 12), titles_from_data=True)
ch.add_data(Reference(sw, min_col=10, min_row=MR, max_row=MR + 12), titles_from_data=True)
ch.set_categories(Reference(sw, min_col=6, min_row=MR + 1, max_row=MR + 12))
ch.height, ch.width = 8, 18
ch.series[0].graphicalProperties.solidFill = 'D6A85F'
ch.series[1].graphicalProperties.solidFill = '3A2E24'
sw.add_chart(ch, 'B47')

pie = PieChart(); pie.title = 'Ganho bruto por tipo de evento'
pie.add_data(Reference(sw, min_col=4, min_row=PR, max_row=PR + n_tipos), titles_from_data=True)
pie.set_categories(Reference(sw, min_col=2, min_row=PR + 1, max_row=PR + n_tipos))
pie.height, pie.width = 8, 12
sw.add_chart(pie, 'G47')

# =========================================================
# LISTAS
# =========================================================
lw = wb.create_sheet('Listas')
lw.sheet_view.showGridLines = False
lw['A1'] = 'Opções dos menus'; lw['A1'].font = f_title
lw['A2'] = 'Pode adicionar novas opções nas linhas vazias de cada coluna. Evite renomear "Fechado", "Aguardando" e "Recusado".'; lw['A2'].font = f_sub
for col, (title, items) in listas.items():
    c = lw[f'{col}4']; c.value = title; c.font = f_head; c.fill = fill_head; c.alignment = center
    lw.column_dimensions[col].width = 24
    for i, it in enumerate(items):
        lw[f'{col}{5+i}'] = it
    for r in range(5, LIST_LAST + 1):
        lw[f'{col}{r}'].border = box; lw[f'{col}{r}'].font = f_body
lw.row_dimensions[4].height = 30

# tab colors
for name, color in [('Como usar', '7A6F62'), ('Resumo', 'D6A85F'), ('Agenda', 'D6A85F'), ('Listas', 'BBBBBB')]:
    wb[name].sheet_properties.tabColor = color
for name in ['Trabalhos', 'Orçamentos', 'Clientes', 'Freelancers', 'Gastos', 'Equipamentos']:
    wb[name].sheet_properties.tabColor = '3A2E24'

wb.active = 1
wb.save(OUT)
print('ok', wb.sheetnames)
