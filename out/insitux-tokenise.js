(()=>{"use strict";var t={d:(e,s)=>{for(var r in s)t.o(s,r)&&!t.o(e,r)&&Object.defineProperty(e,r,{enumerable:!0,get:s[r]})},o:(t,e)=>Object.prototype.hasOwnProperty.call(t,e),r:t=>{"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(t,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(t,"__esModule",{value:!0})}},e={};t.d(e,{tokenise:()=>yt});var s={};t.r(s),t.d(s,{abs:()=>B,acos:()=>G,asin:()=>z,atan:()=>H,ceil:()=>V,charCode:()=>w,codeChar:()=>A,concat:()=>f,cos:()=>_,cosh:()=>L,ends:()=>M,flat:()=>b,floor:()=>R,getTimeMs:()=>q,has:()=>p,isArray:()=>h,isNum:()=>c,len:()=>o,log10:()=>tt,log2:()=>Z,logn:()=>Y,lowerCase:()=>v,max:()=>W,min:()=>D,objKeys:()=>P,padEnd:()=>j,push:()=>x,randInt:()=>I,randNum:()=>E,range:()=>T,reverse:()=>C,round:()=>Q,sign:()=>X,sin:()=>$,sinh:()=>K,slen:()=>i,slice:()=>n,sortBy:()=>g,splice:()=>a,sqrt:()=>J,starts:()=>y,strIdx:()=>u,sub:()=>d,subIdx:()=>m,substr:()=>l,tan:()=>F,tanh:()=>U,toNum:()=>r,trim:()=>S,trimEnd:()=>O,trimStart:()=>k,upperCase:()=>N});const r=t=>Number(t),n=(t,e,s)=>t.slice(e,s),a=(t,e,s)=>t.splice(e,s),o=t=>t.length,i=t=>t.length,c=t=>""!==t&&!Number.isNaN(Number(t)),h=t=>Array.isArray(t),l=(t,e,s)=>t.substring(e,e+(s??t.length)),u=(t,e)=>t[e],d=(t,e)=>t.includes(e),m=(t,e)=>t.indexOf(e),p=(t,e)=>t.includes(e),y=(t,e)=>t.startsWith(e),M=(t,e)=>t.endsWith(e),b=t=>t.flat(),f=(t,e)=>t.concat(e),x=(t,e)=>t.push(...e),g=(t,e)=>t.sort(e),C=t=>t.reverse(),v=t=>t.toLowerCase(),N=t=>t.toUpperCase(),S=t=>t.trim(),k=t=>t.trimStart(),O=t=>t.trimEnd(),j=(t,e)=>t.padEnd(e),w=t=>t.charCodeAt(0),A=t=>String.fromCharCode(t),E=(t,e)=>t+Math.random()*(e-t),I=(t,e)=>Math.floor(E(t,e)),T=t=>[...Array(t).keys()],P=t=>Object.keys(t),q=()=>(new Date).getTime(),B=Math.abs,D=Math.min,W=Math.max,$=Math.sin,_=Math.cos,F=Math.tan,K=Math.sinh,L=Math.cosh,U=Math.tanh,z=Math.asin,G=Math.acos,H=Math.atan,J=Math.sqrt,Q=Math.round,R=Math.floor,V=Math.ceil,X=Math.sign,Y=Math.log,Z=Math.log2,tt=Math.log10,{has:et,flat:st,push:rt,slice:nt,splice:at}=s,{slen:ot,starts:it,sub:ct,substr:ht,strIdx:lt,subIdx:ut}=s,{isNum:dt,len:mt,toNum:pt}=s;function yt(t,e,s=!0,r=!1){const n=[],a=t=>ct("0123456789",t);let[o,i,c,h]=[!1,1,0,[1,0]],[l,u,d]=[!1,!1,!1];for(let m=0,p=ot(t);m<p;++m){const y=lt(t,m),M=m+1!==p?lt(t,m+1):"";if(++c,"\\"===y&&o){n[mt(n)-1].text+=s?{n:"\n",t:"\t",r:"\r",'"':'"'}[M]||("\\"===M?"\\":`\\${M}`):`\\${M}`,++c,++m;continue}const b={invokeId:e,line:i,col:c};if('"'===y){(o=!o)&&(h=[i,c],n.push({typ:"str",text:"",errCtx:b})),u=l=!1;continue}const f=ct(" \t\n\r,",y);if(!o&&f){l=!1,u&&(u=","===y),"\n"===y&&(++i,c=0);continue}if(!o&&";"===y){const e=ut(ht(t,++m),"\n"),s=ht(t,m,e>0?e:p-m);m+=ot(s),++i,c=0,r&&n.push({typ:"rem",text:s,errCtx:b});continue}const x=ct("()[]{}",y);if(u&&!a(y)){const t="x"===y&&"0"===n[mt(n)-1].text;d=d||t,u="b"===y&&"0"===n[mt(n)-1].text||"."===y&&!ct(n[mt(n)-1].text,".")||d&&(t||ct("ABCDEFabcdef",y)),u||x||f||(l=!0,n[mt(n)-1].typ="sym")}if(l&&x&&(l=!1),!o&&!l&&!u){if(x){const t=-1===ut("[{(",y)?")":"(";n.push({typ:t,text:s?t:y,errCtx:b}),!s||"["!==y&&"{"!==y||n.push({typ:"sym",text:"["===y?"vec":"dict",errCtx:b});continue}u=a(y)||"."===y&&a(M)||"-"===y&&(a(M)||"."===M),d=l=!u;const t=l?"sym":"num";n.push({typ:t,text:"",errCtx:b})}n[mt(n)-1].text+=y}return{tokens:n,stringError:o?h:void 0}}window.insituxTokenise=e.tokenise})();
//# sourceMappingURL=insitux-tokenise.js.map