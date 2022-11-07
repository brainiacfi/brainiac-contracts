
# Run a single cvl e.g.:
#  make -B spec/certora/BRErc20/borrowAndRepayFresh.cvl

# TODO:
#  - mintAndRedeemFresh.cvl in progress and is failing due to issues with tool proving how the exchange rate can change
#    hoping for better division modelling - currently fails to prove (a + 1) / b >= a / b
#  - BRErc20Delegator/*.cvl cannot yet be run with the tool
#  - vDAI proofs are WIP, require using the delegate and the new revert message assertions

.PHONY: certora-clean

CERTORA_BIN = $(abspath script/certora)
CERTORA_RUN = $(CERTORA_BIN)/run.py
CERTORA_CLI = $(CERTORA_BIN)/cli.jar
CERTORA_EMV = $(CERTORA_BIN)/emv.jar

export CERTORA = $(CERTORA_BIN)
export CERTORA_DISABLE_POPUP = 1

spec/certora/Math/%.cvl:
	$(CERTORA_RUN) \
	 spec/certora/contracts/MathCertora.sol \
	--verify \
	 MathCertora:$@

spec/certora/BRN/search.cvl:
	$(CERTORA_RUN) \
	spec/certora/contracts/BRNCertora.sol \
	--settings -b=4,-graphDrawLimit=0,-assumeUnwindCond,-depth=100 \
	--solc_args "'--evm-version istanbul'" \
	--verify \
	 BRNCertora:$@

spec/certora/BRN/transfer.cvl:
	$(CERTORA_RUN) \
	spec/certora/contracts/BRNCertora.sol \
	--settings -graphDrawLimit=0,-assumeUnwindCond,-depth=100 \
	--solc_args "'--evm-version istanbul'" \
	--verify \
	 BRNCertora:$@

spec/certora/SXP/search.cvl:
	$(CERTORA_RUN) \
	spec/certora/contracts/SXPCertora.sol \
	--settings -b=4,-graphDrawLimit=0,-assumeUnwindCond,-depth=100 \
	--solc_args "'--evm-version istanbul'" \
	--verify \
	 SXPCertora:$@

spec/certora/SXP/transfer.cvl:
	$(CERTORA_RUN) \
	spec/certora/contracts/SXPCertora.sol \
	--settings -graphDrawLimit=0,-assumeUnwindCond,-depth=100 \
	--solc_args "'--evm-version istanbul'" \
	--verify \
	 SXPCertora:$@

spec/certora/Governor/%.cvl:
	$(CERTORA_RUN) \
	 spec/certora/contracts/GovernorAlphaCertora.sol \
	 spec/certora/contracts/TimelockCertora.sol \
	 spec/certora/contracts/BRNCertora.sol \
	 spec/certora/contracts/SXPCertora.sol \
	 --settings -assumeUnwindCond,-enableWildcardInlining=false \
	 --solc_args "'--evm-version istanbul'" \
	 --link \
	 GovernorAlphaCertora:timelock=TimelockCertora \
	 GovernorAlphaCertora:brn=BRNCertora \
	 GovernorAlphaCertora:sxp=SXPCertora \
	--verify \
	 GovernorAlphaCertora:$@

spec/certora/Comptroller/%.cvl:
	$(CERTORA_RUN) \
	 spec/certora/contracts/ComptrollerCertora.sol \
	 spec/certora/contracts/PriceOracleModel.sol \
	--link \
	 ComptrollerCertora:oracle=PriceOracleModel \
	--verify \
	 ComptrollerCertora:$@

spec/certora/vDAI/%.cvl:
	$(CERTORA_RUN) \
	 spec/certora/contracts/VDaiDelegateCertora.sol \
	 spec/certora/contracts/UnderlyingModelNonStandard.sol \
	 spec/certora/contracts/mcd/dai.sol:Dai \
	 spec/certora/contracts/mcd/pot.sol:Pot \
	 spec/certora/contracts/mcd/vat.sol:Vat \
	 spec/certora/contracts/mcd/join.sol:DaiJoin \
	 tests/Contracts/BoolComptroller.sol \
	--link \
	 VDaiDelegateCertora:comptroller=BoolComptroller \
	 VDaiDelegateCertora:underlying=Dai \
	 VDaiDelegateCertora:potAddress=Pot \
	 VDaiDelegateCertora:vatAddress=Vat \
	 VDaiDelegateCertora:daiJoinAddress=DaiJoin \
	--verify \
	 VDaiDelegateCertora:$@ \
	--settings -cache=certora-run-vdai

spec/certora/BRErc20/%.cvl:
	$(CERTORA_RUN) \
	 spec/certora/contracts/BRErc20ImmutableCertora.sol \
	 spec/certora/contracts/BRTokenCollateral.sol \
	 spec/certora/contracts/ComptrollerCertora.sol \
	 spec/certora/contracts/InterestRateModelModel.sol \
	 spec/certora/contracts/UnderlyingModelNonStandard.sol \
	--link \
	 BRErc20ImmutableCertora:otherToken=BRTokenCollateral \
	 BRErc20ImmutableCertora:comptroller=ComptrollerCertora \
	 BRErc20ImmutableCertora:underlying=UnderlyingModelNonStandard \
	 BRErc20ImmutableCertora:interestRateModel=InterestRateModelModel \
	 BRTokenCollateral:comptroller=ComptrollerCertora \
	 BRTokenCollateral:underlying=UnderlyingModelNonStandard \
	--verify \
	 BRErc20ImmutableCertora:$@ \
	--settings -cache=certora-run-brerc20-immutable

spec/certora/BRErc20Delegator/%.cvl:
	$(CERTORA_RUN) \
	 spec/certora/contracts/BRErc20DelegatorCertora.sol \
	 spec/certora/contracts/BRErc20DelegateCertora.sol \
	 spec/certora/contracts/BRTokenCollateral.sol \
	 spec/certora/contracts/ComptrollerCertora.sol \
	 spec/certora/contracts/InterestRateModelModel.sol \
	 spec/certora/contracts/UnderlyingModelNonStandard.sol \
	--link \
	 BRErc20DelegatorCertora:implementation=BRErc20DelegateCertora \
	 BRErc20DelegatorCertora:otherToken=BRTokenCollateral \
	 BRErc20DelegatorCertora:comptroller=ComptrollerCertora \
	 BRErc20DelegatorCertora:underlying=UnderlyingModelNonStandard \
	 BRErc20DelegatorCertora:interestRateModel=InterestRateModelModel \
	 BRTokenCollateral:comptroller=ComptrollerCertora \
	 BRTokenCollateral:underlying=UnderlyingModelNonStandard \
	--verify \
	 BRErc20DelegatorCertora:$@ \
	--settings -assumeUnwindCond \
	--settings -cache=certora-run-brerc20-delegator

spec/certora/Maximillion/%.cvl:
	$(CERTORA_RUN) \
	 spec/certora/contracts/MaximillionCertora.sol \
	 spec/certora/contracts/BRCKBCertora.sol \
	--link \
	 MaximillionCertora:brCkb=BRCKBCertora \
	--verify \
	 MaximillionCertora:$@

spec/certora/Timelock/%.cvl:
	$(CERTORA_RUN) \
	 spec/certora/contracts/TimelockCertora.sol \
	--verify \
	 TimelockCertora:$@

certora-clean:
	rm -rf .certora_build.json .certora_config certora_verify.json emv-*
