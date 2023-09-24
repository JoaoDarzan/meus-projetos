function menuShow() {
    let iconeCel = document.querySelector('.menuCel');
    if (iconeCel.classList.contains('open')) {
        iconeCel.classList.remove('open');
        document.querySelector('.icon').src = "img/menu_white_36dp.svg";
    } else {
        iconeCel.classList.add('open');
        document.querySelector('.icon').src = "img/close_white_36dp.svg";
    }
}



// modal do site
var modal = document.getElementById('start');

// clicar para abrir e fechar
window.onclick = function(event) {
    if (event.target == modal) {
        modal.style.display = "none";
    }
}




