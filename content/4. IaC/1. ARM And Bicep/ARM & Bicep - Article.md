+++
title = "ARM & Bicep: Why IaC (Lecture 1)"
weight = 1
date = 2025-08-10
draft = false
+++

[Watch the presentation]({{< relref "ARM & Bicep - Lecture 1 - Slides.md" >}})

[Se presentationen på svenska]({{< relref "ARM & Bicep - Lecture 1 - Slides Swe.md" >}})

<!-- Listen to the article -->

<!-- <audio controls>
<source src="/audio/arm-bicep-lecture1.mp3" type="audio/mpeg">
Your browser does not support the audio element.
</audio> -->

---

<!-- # ARM & Bicep: Why IaC (Lecture 1) -->

Infrastructure as Code (**IaC**) lets us define Azure resources **declaratively** and deploy them **repeatably**. This week we move from **Portal & CLI** to **templates** that describe our Ubuntu VM and its network—clean, versioned, and testable.

## What you’ll learn (today)
- The **reason** for IaC (repeatability, drift control, peer review)
- **ARM** (JSON) vs **Bicep** (DSL): same engine, different authoring
- The **anatomy** of a template: parameters, variables, resources, outputs

## Why IaC (for our VM)
- **Consistent**: same template → same VM, NIC, NSG, Public IP every time
- **Auditable**: templates live in Git; PR review replaces “click ops”
- **Safe changes**: use `what-if` to see impact before applying

## ARM vs Bicep (quick compare)
- **ARM**: verbose JSON; native to Azure Resource Manager
- **Bicep**: concise DSL that compiles to ARM; better ergonomics, modules, linter
- **Engine**: both deploy via **Azure Resource Manager**

## Template anatomy (mini-map)
- **parameters**: inputs (location, namePrefix, adminUser, sshKey, myIp)
- **resources**: VNet/Subnet, NSG rules, Public IP, NIC, **Ubuntu VM**
- **outputs**: public IP address (so we can browse Nginx)

## This week’s path
1. **Export & read**: generate an ARM template for your current VM (portal)
2. **Minimal ARM**: author the smallest viable VM stack as JSON
3. **Bicep upgrade**: decompile → clean up → add outputs
4. **Cloud-init**: install Nginx via `customData` (no SSH needed)
5. **What-if & deploy**: preview changes; then create
6. *(Stretch)* **Modules**: split network / security / vm for reuse

## Commands you’ll use
- `az deployment group what-if -f main.bicep -p dev.bicepparam`
- `az deployment group create -f main.bicep -p dev.bicepparam`
- `bicep decompile main.json` and `bicep build main.bicep`

## Prereqs
- Azure subscription & resource group
- VS Code + Bicep extension, Azure CLI
- SSH key pair (or a secure password policy)

> Outcome: a reproducible Ubuntu VM (with Nginx) defined entirely as **code**.
