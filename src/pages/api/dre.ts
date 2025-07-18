// src/pages/api/dre.ts

import { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/prisma";
import { Decimal } from "@prisma/client/runtime/library";

interface DREData {
    nivel1: string | null;
    nivel2: string | null;
    mes: number;
    valorrealizado: Decimal | null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "GET") {
        return res.status(405).json({ error: "Método não permitido" });
    }

    try {
        const idorganizacao = req.query.idorganizacao as string;
        const modelo = req.query.modelo as string;
        const ano = req.query.ano as string;
        const tipo = req.query.tipo as string;

        if (!idorganizacao || !modelo || !ano || !tipo) {
            return res.status(400).json({ error: "Parâmetros obrigatórios ausentes" });
        }

        const dados = await prisma.dre.findMany({
            where: {
                idorganizacao: Number(idorganizacao),
                modelo: modelo,
                ano: Number(ano),
                tipo: tipo
            },
            select: {
                nivel1: true,
                nivel2: true,
                mes: true,
                valorrealizado: true
            }
        });

        // Agrupamento e soma dos valores para pivot
        const resultado: { [key: string]: { [mes: number]: number; total: number } } = {};

        dados.forEach((item: DREData) => {
            const key =
                item.nivel1 === "7.0 - DESPESAS" && item.nivel2
                    ? `${item.nivel1} | ${item.nivel2}`
                    : item.nivel1;

            if (!key) return; // Skip if key is null or undefined

            if (!resultado[key]) {
                resultado[key] = { total: 0 };
                for (let i = 1; i <= 12; i++) {
                    resultado[key][i] = 0;
                }
            }

            if (item.mes >= 1 && item.mes <= 12 && item.valorrealizado !== null) {
                const valor = Math.round(Number(item.valorrealizado));
                resultado[key][item.mes] += valor;
                resultado[key].total += valor;
            }
        });

        res.status(200).json({ data: resultado });
    } catch (error) {
        console.error("Erro ao consultar DRE:", JSON.stringify(error, null, 2));
        res.status(500).json({ error: "Erro ao consultar DRE", detalhes: error });
    }
}
