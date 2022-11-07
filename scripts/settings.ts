import setRewardSpeeds from "./setRewardSpeeds";

const main = async () => {
    console.log("started setting things")
    
    await setRewardSpeeds()
    .then(() => {
      console.log("successfully updated reward speeds");
    })
    .catch((error) => {
      console.error("Error in setting rewardSpeeds :",error);
    });

};

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
