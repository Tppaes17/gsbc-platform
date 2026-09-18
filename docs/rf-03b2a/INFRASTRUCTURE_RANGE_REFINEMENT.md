# Infrastructure Range Refinement

Recomendação para decisão RF-03B.2B, sem provisionamento:

- PostgreSQL RF dedicado: 4-8 vCPU, 16-32 GB RAM, 2-3 TB de storage inicial com expansão e IOPS observáveis.
- Worker separado: 4-8 vCPU, 16 GB RAM e 100-200 GB de scratch se processar partições sequencialmente; não manter toda extração simultânea.
- Object storage: 50-150 GB para ZIPs, manifests e artefatos de recuperação conforme retenção.
- Rede: pelo menos 10 GB/mês de ingress, com retries; Receita observada a 0.35-0.41 MB/s sob VPN.
- Execução mensal sequencial projetada: 12-24 h, dominada por download/normalização; medir novamente no host escolhido.

Produção deve permanecer isolada do banco transacional GSBC. Worker reachability da Receita em produção continua **NOT PROVEN**.
