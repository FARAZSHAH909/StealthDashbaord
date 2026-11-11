# Kali Linux & GUI (Win-KeX) Installation Guide for WSL2

Yeh guide aapke Kali Linux aur GUI setup ke steps ke liye hai.

---

## 1. BIOS mein Virtualization Enable Karna
1. Apna PC **Restart** karein.
2. Boot screen aate hi **F2**, **Del**, ya **F10** key press karke BIOS/UEFI mein jayein.
3. Configuration / Advanced CPU options mein:
   - **Intel**: "Intel Virtualization Technology" (VT-x) -> **Enabled**
   - **AMD**: "SVM Mode" ya "AMD-V" -> **Enabled**
4. **F10** press karke **Save and Exit** karein aur Windows mein login karein.

---

## 2. WSL aur Kali Linux Install Karna
1. Start menu par right-click karein aur select karein:
   **Windows PowerShell (Admin)**
2. Yeh command run karein:
   ```powershell
   wsl --install -d kali-linux
   ```
3. Installation poori hone ke baad system **Restart** karne bolega, restart karein.
4. Reboot hote hi Kali Linux ki black window open hogi, wahan apna pasandeeda:
   - **Username** type karein aur Enter dabayein.
   - **Password** type karein (password type karte waqt screen par dikhega nahi, bas type karke Enter karein).

---

## 3. Kali Linux GUI (Win-KeX) Install Karna
Kali terminal ke andar yeh command run karein:
```bash
sudo apt update && sudo apt install -y kali-win-kex
```
*(Yahan apna banaya hua password enter karein jab prompt aaye).*

---

## 4. GUI Desktop Launch Karna
Jab bhi Kali ka full desktop interface kholna ho:
```bash
kex --win -s
```
*(Yeh ek alag window mein Kali Linux ka complete desktop GUI open kar dega with sound support).*
