+++
title = "ARM & Bicep – Lecture 1 – Slides"
weight = 1
date = 2025-08-10
draft = false
+++

<!-- RevealJS-compatible: slides separated by --- -->

# ARM & Bicep: Why IaC
*Lecture 1*  
**Goal:** Move from Portal/CLI to **templates** for an Ubuntu VM

---

## Why IaC
- Repeatable, auditable, versioned
- Prevent config drift
- Review with PRs instead of clicks

---

## ARM vs Bicep (same engine)
- **ARM**: JSON, verbose
- **Bicep**: concise DSL, compiles to ARM
- Tools: VS Code ext, linter, modules

---

## Template anatomy
- **parameters**: location, namePrefix, adminUser, sshKey, myIp
- **resources**: VNet/Subnet, NSG, Public IP, NIC, **Ubuntu VM**
- **outputs**: public IP

---

## Minimal VM stack
- VNet + Subnet
- NSG: allow 22 (from my IP), allow 80 (optional)
- Public IP + NIC
- Ubuntu VM (cloud-init)

---

## Cloud-init (customData)
- Install Nginx
- Write a simple index.html
- No SSH required to verify

---

## Workflow
```bash
az deployment group what-if -f main.bicep -p dev.bicepparam
az deployment group create -f main.bicep -p dev.bicepparam
bicep decompile main.json
```
- Validate → Deploy → Inspect outputs

---

## Today’s lab
1) Export ARM from portal (read it)  
2) Minimal ARM → Bicep  
3) Add cloud-init & outputs  
4) (Stretch) Split into modules

---

## Next
- Param files for envs
- Hardening (SSH allowlist, default-deny)
- Bastion (no Public IP) *(stretch)*
