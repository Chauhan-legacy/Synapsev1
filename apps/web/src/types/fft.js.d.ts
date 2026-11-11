declare module 'fft.js' {
  export default class FFT {
    size: number;
    table: number[];
    constructor(size: number);
    createComplexArray(): number[] | Float64Array;
    toComplexArray(real: ArrayLike<number>, storage?: ArrayLike<number>): number[] | Float64Array;
    fromComplexArray(complex: ArrayLike<number>, storage?: ArrayLike<number>): number[] | Float64Array;
    transform(out: ArrayLike<number>, data: ArrayLike<number>): void;
    realTransform(out: ArrayLike<number>, data: ArrayLike<number>): void;
    inverseTransform(out: ArrayLike<number>, data: ArrayLike<number>): void;
    completeSpectrum(out: ArrayLike<number>): void;
  }
}
