// stackoverflow.com/q/12350790
Function.prototype['∘'] = function(f){
    return x => this(f(x))
  }
  
  const multiply = a => b => (a * b)
  const double = multiply (2)
  const doublethreetimes = (double) ['∘'] (double) ['∘'] (double)
  
  console.log(doublethreetimes(3));

