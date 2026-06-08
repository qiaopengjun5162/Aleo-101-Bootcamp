const ALICE = "aleo1rhgdu77hgyqd3xjj8ucu3jj9r2krwz6mnzyd80gncr5fxcwlh5rsvzp9px";
const BOB = "aleo1ayymcezu09pnkmyyshvnlp82t9qvqeg5ej4w85c9gfalmhe9fczss6v5fp";

function mintPrivate(receiver, amount) {
  return {
    owner: receiver,
    amount: BigInt(amount),
  };
}

function transferPrivate(sender, receiver, amount) {
  const value = BigInt(amount);
  if (value > sender.amount) {
    throw new Error("insufficient private record amount");
  }

  return {
    change: {
      owner: sender.owner,
      amount: sender.amount - value,
    },
    payment: {
      owner: receiver,
      amount: value,
    },
  };
}

function printRecord(label, record) {
  console.log(`${label}:`);
  console.log(`  owner  = ${record.owner}`);
  console.log(`  amount = ${record.amount}u64`);
}

const minted = mintPrivate(ALICE, 100);
const { change, payment } = transferPrivate(minted, BOB, 35);

console.log("Private token demo");
console.log("This mirrors the Leo record flow in src/main.leo.");
console.log();
printRecord("mint_private output", minted);
console.log();
printRecord("transfer_private change output", change);
console.log();
printRecord("transfer_private payment output", payment);
