// Receita Federal: ASCII value minus 48, weighted modulo 11 for numeric and alphanumeric CNPJ.
export function normalizeDocument(value: string) { return value.trim().toUpperCase().replace(/[. /-]/g, ""); }
export function validDocument(value: string, cnpj = false) {
  const v=normalizeDocument(value), size=cnpj?14:11;
  if(!(cnpj?/^[A-Z0-9]{12}[0-9]{2}$/:/^\d{11}$/).test(v) || new Set(v).size===1)return false;
  for(let n=size-2;n<size;n++) {
    let sum=0;
    for(let i=0;i<n;i++)sum+=(v.charCodeAt(i)-48)*(cnpj?((n-1-i)%8+2):(n+1-i));
    const digit=11-sum%11;
    if(Number(v[n])!==(digit>=10?0:digit))return false;
  }
  return true;
}
export function maskDocument(value: string, cnpj = false) {
  const v=normalizeDocument(value);
  const positions=cnpj?[[2,"."],[5,"."],[8,"/"],[12,"-"]] as const:[[3,"."],[6,"."],[9,"-"]] as const;
  let result="";
  for(let i=0;i<v.length;i++){const separator=positions.find(p=>p[0]===i);if(separator)result+=separator[1];result+=v[i];}
  return result;
}
