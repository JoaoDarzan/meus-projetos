class Validator {

    constructor() {
      this.validations = [
        'data-min-length',
        'data-max-length',
        'data-only-letters',
        'data-required',
        'data-equal',
        'data-senha-validate',
      ]
    }
  
    // inicia a validação de todos os campos
    validate(form) {
  
      // limpa todas as validações antigas
      let currentValidations = document.querySelectorAll('form .erro');
  
      if(currentValidations.length) {
        this.cleanValidations(currentValidations);
      }
  
      // pegar todos inputs
      let inputs = form.getElementsByTagName('input');
      // transformar HTMLCollection em arr
      let inputsArray = [...inputs];
  
      // loop nos inputs e validação mediante aos atributos encontrados
      inputsArray.forEach(function(input, obj) {
  
        // fazer validação de acordo com o atributo do input
        for(let i = 0; this.validations.length > i; i++) {
          if(input.getAttribute(this.validations[i]) != null) {
  
            // limpa string para saber o método
            let method = this.validations[i].replace("data-", "").replace("-", "");
  
            // valor do input
            let value = input.getAttribute(this.validations[i])
  
            // invoca o método
            this[method](input,value);
  
          }
        }
  
      }, this);
  
    }
  
    // método para validar se tem um mínimo de caracteres
    minlength(input, minValue) {
  
      let inputLength = input.value.length;
  
      let errorMessage = `O campo precisa ter pelo menos ${minValue} caracteres`;
  
      if(inputLength < minValue) {
        this.printMessage(input, errorMessage);
      }
  
    }
  
    // método para validar se passou do máximo de caracteres
    maxlength(input, maxValue) {
  
      let inputLength = input.value.length;
  
      let errorMessage = `O campo precisa ter menos que ${maxValue} caracteres`;
  
      if(inputLength > maxValue) {
        this.printMessage(input, errorMessage);
      }
  
    }
  


    // método para validar strings que só contem letras
    onlyletters(input) {
  
      let re = /^[A-Za-z]+$/;;
  
      let inputValue = input.value;
  
      let errorMessage = `Este campo não aceita números nem caracteres especiais`;
  
      if(!re.test(inputValue)) {
        this.printMessage(input, errorMessage);
      }
  
    }
  


  
    // verificar se um campo está igual o outro
    equal(input, inputName) {
  
      let inputToCompare = document.getElementsByName(inputName)[0];
  
      let errorMessage = `Este campo precisa estar igual ao ${inputName}`;
  
      if(input.value != inputToCompare.value) {
        this.printMessage(input, errorMessage);
      }
    }
    


    // método para exibir inputs que são necessários
    required(input) {
  
      let inputValue = input.value;
  
      if(inputValue === '') {
        let errorMessage = `Este campo é obrigatório`;
  
        this.printMessage(input, errorMessage);
      }
  
    }
  


    // validando o campo de senha
    senhavalidate(input) {
  
      // explodir string em array
      let charArr = input.value.split("");
  
      let uppercases = 0;
      let numbers = 0;
  
      for(let i = 0; charArr.length > i; i++) {
        if(charArr[i] === charArr[i].toUpperCase() && isNaN(parseInt(charArr[i]))) {
          uppercases++;
        } else if(!isNaN(parseInt(charArr[i]))) {
          numbers++;
        }
      }
  
    
  
    }
  



    // método para imprimir mensagens de erro
    printMessage(input, msg) {
    
      // checa os erros presentes no input
      let errorsQty = input.parentNode.querySelector('.erro');
  
      // imprimir erro só se não tiver erros
      if(errorsQty === null) {
        let template = document.querySelector('.erro').cloneNode(true);
  
        template.textContent = msg;
    
        let inputParent = input.parentNode;
    
        template.classList.remove('template');
    
        inputParent.appendChild(template);
      }
  
    }
  



    // remove todas as validações para fazer a checagem novamente
    cleanValidations(validations) {
      validations.forEach(el => el.remove());
    }
  
  }
  let form = document.getElementById('forms');
  let cadastrar = document.getElementById('entrar');
  
  let validator = new Validator();
  
  // evento de envio do form, que valida os inputs
  cadastrar.addEventListener('click', function(e) {
    e.preventDefault();
  
    validator.validate(form);
  });
  
  /* Mascara cpf*/
  
  let cpf = document.querySelector('#cpf')

cpf.addEventListener('keypress', () => {
  let tamanhocpf = cpf.value.length

  if(tamanhocpf === 3 || tamanhocpf === 7) {
    cpf.value += '.'
  }
  if( tamanhocpf === 11) {
    cpf.value += '-'
  }

})