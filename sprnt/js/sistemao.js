//o botão topo
var mybutton = document.getElementById("myBtn");

// o botão irá aparecer dps de chegar a 20px de altura
window.onscroll = function() {scrollFunction()};

function scrollFunction() {
  if (document.body.scrollTop > 20 || document.documentElement.scrollTop > 20) {
    mybutton.style.display = "block";
  } else {
    mybutton.style.display = "none";
  }
}
// função ao clicar no botão ele subir para o inicio da pagina
function topFunction() {
  document.body.scrollTop = 0;
  document.documentElement.scrollTop = 0;
}


// função ao clicar no pacotes ele descer para a parte dos pacotes
function lowFunction() {
  document.body.scrollTop = 1300;
  document.documentElement.scrollTop = 1300;
}






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


// slides automatico
let slideIndex = 0;
showSlides();

function showSlides() {
  let i;
  let slides = document.getElementsByClassName("slide");
  for (i = 0; i < slides.length; i++) {
    slides[i].style.display = "none";
  }
  slideIndex++;
  if (slideIndex > slides.length) {slideIndex = 1}
  slides[slideIndex-1].style.display = "block";
  setTimeout(showSlides, 3500); // cada 1000 = 1 segundo
}




// modal do site
var modal = document.getElementById('start');

// clicar para abrir e fechar
window.onclick = function(event) {
    if (event.target == modal) {
        modal.style.display = "none";
    }
}







