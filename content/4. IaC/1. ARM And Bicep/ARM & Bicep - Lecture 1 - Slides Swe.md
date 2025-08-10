+++
title = "ARM & Bicep – Föreläsning 1 – Bilder"
weight = 1
date = 2025-08-10
draft = false
+++

<!-- RevealJS-kompatibel: bilder separeras med --- -->

# ARM & Bicep: Varför IaC
*Föreläsning 1*  
**Mål:** Gå från Portal/CLI till **mallar** för en Ubuntu-VM

---

## Varför IaC
- Reproducerbart, granskningsbart, versionshanterat
- Motverkar konfigurationsdrift
- PR-granskning ersätter klick i portalen

---

## ARM vs Bicep (samma motor)
- **ARM**: JSON, mer omständligt
- **Bicep**: kortfattad DSL, kompilerar till ARM
- Verktyg: VS Code-tillägg, linter, moduler

---

## Mallens anatomi
- **parameters**: location, namePrefix, adminUser, sshKey, myIp
- **resources**: VNet/Subnet, NSG, Public IP, NIC, **Ubuntu VM**
- **outputs**: public IP

---

## Minimal VM-stack
- VNet + Subnet
- NSG: tillåt 22 (från min IP), tillåt 80 (valfritt)
- Public IP + NIC
- Ubuntu VM (cloud-init)

---

## Cloud-init (customData)
- Installera Nginx
- Skriv enkel index.html
- Ingen SSH krävs för att verifiera

---

## Arbetsflöde
```bash
az deployment group what-if -f main.bicep -p dev.bicepparam
az deployment group create -f main.bicep -p dev.bicepparam
bicep decompile main.json
```
- Validera → Distribuera → Läs outputs

---

## Dagens labb
1) Exportera ARM från portalen (läs)  
2) Minimal ARM → Bicep  
3) Lägg till cloud-init & outputs  
4) (Stretch) Dela upp i moduler

---

## Nästa gång
- Parameterfiler för miljöer
- Härdning (SSH allowlist, default deny)
- Bastion (utan Public IP) *(stretch)*
