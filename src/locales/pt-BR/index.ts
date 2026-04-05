/**
 * Agregador de traduções para pt-BR.
 * Pega todos os arquivos .json nesta pasta e os exporta como um único objeto.
 */

const modules = import.meta.glob("./*.json", { eager: true });

const ptBR: Record<string, any> = {};

for (const path in modules) {
  const fileName = path.split("/").pop()?.replace(".json", "");
  if (fileName) {
    ptBR[fileName] = (modules[path] as any).default;
  }
}

export default ptBR;
