const generateCode = () => {
  return Math.floor(1000 + Math.random() * 9000).toString();
};

export async function getUniqueCode(
  db: FirebaseFirestore.Firestore,
  collection: string
) {
  let code;
  let docRef;
  let doc;

  do {
    code = generateCode();
    docRef = db.collection(collection).doc(code);
    doc = await docRef.get();
  } while (doc.exists);

  return code;
}
