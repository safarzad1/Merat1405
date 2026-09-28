async function toPng(node: HTMLElement, options:any={}){
  const width=options.width||node.scrollWidth||node.clientWidth||800;
  const height=options.height||node.scrollHeight||node.clientHeight||600;
  const clone=node.cloneNode(true) as HTMLElement;
  clone.setAttribute('xmlns','http://www.w3.org/1999/xhtml');
  const serializer=new XMLSerializer();
  const html=serializer.serializeToString(clone);
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><foreignObject width="100%" height="100%">${html}</foreignObject></svg>`;
  const blob=new Blob([svg],{type:'image/svg+xml;charset=utf-8'});
  const url=URL.createObjectURL(blob);
  try{
    const img=new Image();
    await new Promise<void>((resolve,reject)=>{img.onload=()=>resolve();img.onerror=()=>reject(new Error('render error'));img.src=url});
    const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const ctx=canvas.getContext('2d');if(!ctx)throw new Error('canvas error');ctx.fillStyle=options.bgcolor||options.backgroundColor||'#fff';ctx.fillRect(0,0,width,height);ctx.drawImage(img,0,0,width,height);return canvas.toDataURL('image/png');
  }finally{URL.revokeObjectURL(url)}
}
export default {toPng};
export {toPng};
