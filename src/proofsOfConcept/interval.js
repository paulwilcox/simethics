
module.exports = class interval {

  constructor(lowerIsInclusive, lower, upper, upperIsInclusive) {
      
      // if only one argument is passed, it should either be ...
      // ... an interval, in which case just copy it, or 
      // ... a non-interval, in which case, if primitive, 
      //     make a degenerate interval out of it
      if (
          lowerIsInclusive !== undefined && 
          lower === undefined &&
          upper === undefined && 
          upperIsInclusive === undefined
      ) {
          let obj = lowerIsInclusive
          let objType = typeof obj
          if (obj instanceof interval) {
              lowerIsInclusive = obj.lowerIsInclusive
              upperIsInclusive = obj.upperIsInclusive
              lower = obj.lower
              upper = obj.upper
          }
          else if (['number','string'].includes(objType)) {
              lowerIsInclusive = true
              upperIsInclusive = true
              lower = obj
              upper = obj
          }
          else 
              throw `obj type (${objType}) cannot be converted to an interval.`    
      }

      this.lowerIsInclusive = lowerIsInclusive
      this.upperIsInclusive = upperIsInclusive
      this.lower = lower
      this.upper = upper
      
      if (this.lower > this.upper) 
          throw 'lower cannot be greater than upper'

      this.length = 
          this.lower == this.upper && this.lowerIsInclusive && this.upperIsInclusive ? 1
          : this.lower == this.upper ? 0
          : Infinity

  }

  // aliases
  get l () { return this.lower }
  set l (value) { this.lower = value }
  get u () { return this.upper }
  set u (value) { this.upper = value }
  get li () { return this.lowerIsInclusive }
  set li (value) { this.lowerIsInclusive = value }
  get ui () { return this.upperIsInclusive }
  set ui (value) { this.upperIsInclusive = value }

  toString() {
      return `${this.lowerIsInclusive ? '⟦' : '⦅'}` + 
          `${this.lower},` + 
          `${this.upper}` + 
          `${this.upperIsInclusive ? '⟧' : '⦆'}` 
  }

}