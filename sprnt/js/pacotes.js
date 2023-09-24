/* macara cartão */
let cartao = document.querySelector('#numeroCartao')
cartao.addEventListener('keypress', () => {
    let tamanhoCartao= cartao.value.length
    if (tamanhoCartao === 4 || tamanhoCartao === 9 || tamanhoCartao === 14) {
        cartao.value += '-'
    }
})


/* mascara validade do cartão */
let validade = document.querySelector('#validade')
validade.addEventListener('keypress', () => {
    let tamanhoValidade = validade.value.length
    if (tamanhoValidade === 2) {
        validade.value += '/'
    }
})


/* mascara do cep */
let cep = document.querySelector('#cep')
cep.addEventListener('keypress', () => {
    let tamanhoCep = cep.value.length
    if (tamanhoCep === 5) {
        cep.value += '-'
    }
})

// valor checkbox
function ativo() {
let opcaoAtivo = document.getElementById('opcaoAtivo')
let valor = document.getElementById('valor')
let pacote = document.getElementById('pacote')



if (opcaoAtivo.checked == true) {
    Location
}}



function chamado() {
    let opcaoChamado = document.querySelector('#opcaoChamado')
    let valor = document.getElementById('valor')
    let pacote = document.getElementById('pacote')
    if (opcaoChamado.checked == true) {
        alert('foi')
    }
}



function estoque() {
    let opcaoEstoque = document.querySelector('#opcaoEstoque')
    let valor = document.getElementById('valor')
    let pacote = document.getElementById('pacote')
}



