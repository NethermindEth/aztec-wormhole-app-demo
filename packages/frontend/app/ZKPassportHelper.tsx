import {
  type ProofResult,
  getProofData,
  getCommitmentFromDSCProof,
  getMerkleRootFromDSCProof,
  getCommitmentInFromIDDataProof,
  getCommitmentOutFromIDDataProof,
  getNullifierFromDisclosureProof,
  getCommitmentInFromIntegrityProof,
  getCommitmentOutFromIntegrityProof,
  getCommitmentInFromDisclosureProof,
  ultraVkToFields,
  getNumberOfPublicInputs,
  CircuitManifest,
} from "@zkpassport/utils";
import { RegistryClient } from "@zkpassport/registry";
import assert from "assert";

export interface ContractProofData {
  vkeys: {
    vkey_a: bigint[];
    vkey_b: bigint[];
    vkey_c: bigint[];
    vkey_d: bigint[];
    vkey_e: bigint[];
  };
  proofs: {
    proof_a: bigint[];
    proof_b: bigint[];
    proof_c: bigint[];
    proof_d: bigint[];
    proof_e: bigint[];
  };
  vkey_hashes: {
    vkey_hash_a: bigint;
    vkey_hash_b: bigint;
    vkey_hash_c: bigint;
    vkey_hash_d: bigint;
    vkey_hash_e: bigint;
  };
  public_inputs: {
    input_a: bigint[];
    input_b: bigint[];
    input_c: bigint[];
    input_d: bigint[];
    input_e: bigint[];
  };
}

const ZKPASSPORT_CONFIG = {
  PROOF_SIZE: 508,
  VKEY_SIZE: 115,
  CHAIN_ID: 11155111,
  PROOF_KEYWORDS: {
    A: "sig_check_dsc", // Document Signer Certificate check
    B: "sig_check_id_data", // ID Data check
    C: "data_check_integrity", // Integrity check
    D: "disclose_bytes", // Disclosure check (formerly E)
    E: "compare_age", // Age comparison check (formerly F)
    // Note: Using 5 proofs instead of 6. Proof F is no longer used.
  },
  PUBLIC_INPUT_SIZES: {
    input_a: 2,
    input_b: 2,
    input_c: 2,
    input_d: 7,
    input_e: 7,
  },
} as const;

type CircuitType = "A" | "B" | "C" | "D" | "E";

type SubCircuitProof = {
  vkey: bigint[];
  proof: bigint[];
  public_inputs: bigint[];
  vkey_hash: bigint;
  commitments: bigint[];
};

/**
 * ZKPassportHelper class provides methods for working with zkPassport proofs
 * and preparing them for use with Aztec contracts.
 */
export class ZKPassportHelper {
  private static readonly PROOF_SIZE = ZKPASSPORT_CONFIG.PROOF_SIZE;
  private static readonly VKEY_SIZE = ZKPASSPORT_CONFIG.VKEY_SIZE;
  private static readonly CHAIN_ID = ZKPASSPORT_CONFIG.CHAIN_ID;
  private static readonly registryClient = new RegistryClient({
    chainId: ZKPASSPORT_CONFIG.CHAIN_ID,
  });
  private static circuitManifest: CircuitManifest;

  private static validateProofData(
    vkey: bigint[],
    formattedProofData: bigint[],
    publicInputs: bigint[],
    commitments: bigint[],
    circuitType: CircuitType
  ): void {
    // Log actual sizes for debugging
    console.log(`Circuit ${circuitType} sizes:`, {
      vkeySize: vkey.length,
      proofSize: formattedProofData.length,
      publicInputsSize: publicInputs.length,
      commitmentsSize: commitments.length,
    });

    // Validate vkey exists and has reasonable size (flexible validation)
    if (!vkey || vkey.length === 0 || vkey.length > 200) {
      throw new Error(
        `Invalid vkey size for circuit ${circuitType}: got ${vkey.length}, expected between 1 and 200`
      );
    }

    // Validate proof exists and has reasonable size (flexible validation)
    if (!formattedProofData || formattedProofData.length !== 508) {
      throw new Error(
        `Invalid proof size for circuit ${circuitType}: got ${formattedProofData.length}, expected between 1 and 600`
      );
    }

    // Validate public inputs (keep strict but allow observed sizes)
    // Observed sizes: A=2, B=2, C=2, D=7, E=5
    if (![2, 5, 7, 10].includes(publicInputs.length)) {
      throw new Error(
        `Invalid public inputs size for circuit ${circuitType}: expected 2, 5, 7, or 10, got ${publicInputs.length}`
      );
    }

    // Validate commitments (keep strict)
    if (commitments.length !== 2) {
      throw new Error(
        `Invalid commitments size for circuit ${circuitType}: expected 2, got ${commitments.length}`
      );
    }
  }

  private static logError(context: string, error: unknown): void {
    console.error(`Error in ${context}:`, error);
    if (error instanceof Error) {
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    }
  }

  private static findProofsByKeywords(proofs: ProofResult[]): {
    proofA: ProofResult | undefined;
    proofB: ProofResult | undefined;
    proofC: ProofResult | undefined;
    proofD: ProofResult | undefined;
    proofE: ProofResult | undefined;
  } {
    const proofKeywords = ZKPASSPORT_CONFIG.PROOF_KEYWORDS;

    console.log("Looking for proofs with keywords:", proofKeywords);
    console.log(
      "Available proof names:",
      proofs.map((p) => p.name)
    );

    return {
      proofA: proofs.find((p) =>
        p.name?.toLowerCase().includes(proofKeywords.A.toLowerCase())
      ),
      proofB: proofs.find((p) =>
        p.name?.toLowerCase().includes(proofKeywords.B.toLowerCase())
      ),
      proofC: proofs.find((p) =>
        p.name?.toLowerCase().includes(proofKeywords.C.toLowerCase())
      ),
      proofD: proofs.find((p) =>
        p.name?.toLowerCase().includes(proofKeywords.D.toLowerCase())
      ),
      proofE: proofs.find((p) =>
        p.name?.toLowerCase().includes(proofKeywords.E.toLowerCase())
      ),
    };
  }

  private static validateProofOrder(proofs: ProofResult[]): boolean {
    const proofKeywords = ZKPASSPORT_CONFIG.PROOF_KEYWORDS;
    const expectedProofOrder = [
      proofKeywords.A,
      proofKeywords.B,
      proofKeywords.C,
      proofKeywords.D,
      proofKeywords.E,
    ];

    const detectedOrder = proofs.map((proof) => {
      const name = proof.name?.toLowerCase();
      if (name?.includes(proofKeywords.A.toLowerCase())) return proofKeywords.A;
      if (name?.includes(proofKeywords.B.toLowerCase())) return proofKeywords.B;
      if (name?.includes(proofKeywords.C.toLowerCase())) return proofKeywords.C;
      if (name?.includes(proofKeywords.D.toLowerCase())) return proofKeywords.D;
      if (name?.includes(proofKeywords.E.toLowerCase())) return proofKeywords.E;
      return "unknown";
    });

    let isCorrectOrder = true;
    for (
      let i = 0;
      i < Math.min(detectedOrder.length, expectedProofOrder.length);
      i++
    ) {
      if (detectedOrder[i] !== expectedProofOrder[i]) {
        isCorrectOrder = false;
        console.error(
          `Incorrect proof at position ${i}: expected ${expectedProofOrder[i]}, got ${detectedOrder[i]}`
        );
      }
    }

    if (!isCorrectOrder) {
      console.error(
        "Proofs are not in the correct order. This may lead to verification failure."
      );
      console.error(
        "The proofs must follow this order:",
        expectedProofOrder.join(" → ")
      );
    } else {
      console.log("✓ Proofs are in the correct order");
    }

    return isCorrectOrder;
  }

  /**
   * Format all proofs for the smart contract
   * @param proofs - Array of proof results to format
   * @returns Promise resolving to contract proof data or undefined if an error occurs
   */
  public static async formatProofsForContract(
    proofs: ProofResult[]
  ): Promise<ContractProofData | undefined> {
    try {
      console.log("Starting formatProofsForContract with proofs:", proofs);
      console.log("Number of proofs received:", proofs.length);
      console.log(
        "Proof names:",
        proofs.map((p: ProofResult) => p.name)
      );

      // Validate number of proofs (updated to 5)
      if (proofs.length !== 5) {
        console.error(
          `Incorrect number of proofs: expected 5, got ${proofs.length}`
        );
        return undefined;
      }

      // Find proofs by keywords
      const { proofA, proofB, proofC, proofD, proofE } =
        this.findProofsByKeywords(proofs);

      console.log("Found proofs:");
      console.log("- proofA (DSC):", proofA?.name || "NOT FOUND");
      console.log("- proofB (ID Data):", proofB?.name || "NOT FOUND");
      console.log("- proofC (Integrity):", proofC?.name || "NOT FOUND");
      console.log("- proofD (Disclosure):", proofD?.name || "NOT FOUND");
      console.log("- proofE (Age):", proofE?.name || "NOT FOUND");

      // Check if all required proofs were found
      if (!proofA || !proofB || !proofC || !proofD || !proofE) {
        this.logMissingProofs(proofA, proofB, proofC, proofD, proofE);
        return undefined;
      }

      // Create filtered proofs array in the correct order
      const filteredProofs = [proofA, proofB, proofC, proofD, proofE];

      // Validate proof order
      this.validateProofOrder(filteredProofs);

      // Initialize circuit manifest
      this.circuitManifest = await this.registryClient.getCircuitManifest(
        undefined,
        {
          version: proofA.version,
        }
      );

      // Format all subcircuits (now with 5 proofs)
      const formattedProofs = await this.formatAllSubCircuits(
        proofA,
        proofB,
        proofC,
        proofD,
        proofE
      );

      console.log("✓ All 5 proofs formatted successfully");

      // Create final contract data
      return this.createContractProofData(formattedProofs);
    } catch (error) {
      this.logError("formatProofsForContract", error);
      return undefined;
    }
  }

  private static logMissingProofs(
    proofA: ProofResult | undefined,
    proofB: ProofResult | undefined,
    proofC: ProofResult | undefined,
    proofD: ProofResult | undefined,
    proofE: ProofResult | undefined
  ): void {
    console.error("Missing required proofs:");
    if (!proofA) console.error("- Missing DSC proof (Circuit A)");
    if (!proofB) console.error("- Missing ID Data proof (Circuit B)");
    if (!proofC) console.error("- Missing Integrity proof (Circuit C)");
    if (!proofD) console.error("- Missing Disclosure proof (Circuit D)");
    if (!proofE) console.error("- Missing Age proof (Circuit E)");
  }

  private static async formatAllSubCircuits(
    proofA: ProofResult,
    proofB: ProofResult,
    proofC: ProofResult,
    proofD: ProofResult,
    proofE: ProofResult
  ) {
    console.log("Formatting all 5 proofs...");

    console.log("Formatting proof A (DSC):", proofA.name);
    const formattedProofA = await this.formatSubCircuit(proofA, "A");

    console.log("Formatting proof B (ID Data):", proofB.name);
    const formattedProofB = await this.formatSubCircuit(proofB, "B");

    console.log("Formatting proof C (Integrity):", proofC.name);
    const formattedProofC = await this.formatSubCircuit(proofC, "C");

    console.log("Formatting proof D (Disclosure):", proofD.name);
    const formattedProofD = await this.formatSubCircuit(proofD, "D");

    console.log("Formatting proof E (Age):", proofE.name);
    const formattedProofE = await this.formatSubCircuit(proofE, "E");

    return {
      formattedProofA,
      formattedProofB,
      formattedProofC,
      formattedProofD,
      formattedProofE,
    };
  }

  private static createContractProofData(formattedProofs: {
    formattedProofA: SubCircuitProof;
    formattedProofB: SubCircuitProof;
    formattedProofC: SubCircuitProof;
    formattedProofD: SubCircuitProof;
    formattedProofE: SubCircuitProof;
  }): ContractProofData {
    const {
      formattedProofA,
      formattedProofB,
      formattedProofC,
      formattedProofD,
      formattedProofE,
    } = formattedProofs;

    return {
      vkeys: {
        vkey_a: formattedProofA.vkey,
        vkey_b: formattedProofB.vkey,
        vkey_c: formattedProofC.vkey,
        vkey_d: formattedProofD.vkey,
        vkey_e: formattedProofE.vkey,
      },
      proofs: {
        proof_a: formattedProofA.proof,
        proof_b: formattedProofB.proof,
        proof_c: formattedProofC.proof,
        proof_d: formattedProofD.proof,
        proof_e: formattedProofE.proof,
      },
      vkey_hashes: {
        vkey_hash_a: formattedProofA.vkey_hash,
        vkey_hash_b: formattedProofB.vkey_hash,
        vkey_hash_c: formattedProofC.vkey_hash,
        vkey_hash_d: formattedProofD.vkey_hash,
        vkey_hash_e: formattedProofE.vkey_hash,
      },
      public_inputs: {
        input_a: formattedProofA.public_inputs,
        input_b: formattedProofB.public_inputs,
        input_c: formattedProofC.public_inputs,
        input_d: formattedProofD.public_inputs,
        input_e: formattedProofE.public_inputs,
      },
    };
  }

  /**
   * Get verification key for a circuit using name and hash
   * @param proofResult - The proof result containing circuit information
   * @returns Promise resolving to an array of bigints representing the verification key or undefined
   */
  public static async getCircuitVerificationKey(
    proofResult: ProofResult
  ): Promise<{ vkeyFields: bigint[]; vkeyHash: string } | undefined> {
    try {
      this.validateProofResult(proofResult);

      const hostedPackagedCircuit =
        await this.registryClient.getPackagedCircuit(
          proofResult.name!,
          this.circuitManifest
        );

      if (hostedPackagedCircuit && hostedPackagedCircuit.vkey) {
        const vkeyUint8Array = this.base64ToUint8Array(
          hostedPackagedCircuit.vkey
        );
        const vkeyFieldsString = ultraVkToFields(vkeyUint8Array);

        const vkeyFields: bigint[] = vkeyFieldsString.map((f: string) =>
          BigInt(f.startsWith("0x") ? f : "0x" + f)
        );

        return { vkeyFields, vkeyHash: proofResult.vkeyHash! };
      }

      return undefined;
    } catch (error) {
      this.logError("getCircuitVerificationKey", error);
      return undefined;
    }
  }

  private static validateProofResult(proofResult: ProofResult): void {
    if (
      !proofResult.name ||
      !proofResult.vkeyHash ||
      !proofResult.version ||
      !proofResult.proof
    ) {
      throw new Error(
        "Missing required proof information (name, vkeyHash, version, or proof)"
      );
    }
  }

  /**
   * Unified function to format circuit proof data structures
   * @param proofResult - The proof result to format
   * @param circuitType - The type of circuit (A, B, C, D, E, or F)
   * @returns Promise resolving to an object containing vkey, proof, and public_inputs
   */
  public static async formatSubCircuit(
    proofResult: ProofResult,
    circuitType: CircuitType
  ): Promise<SubCircuitProof> {
    try {
      // Get the proof data
      const proofData = getProofData(
        proofResult.proof as string,
        getNumberOfPublicInputs(proofResult.name!)
      );
      const formattedProofData = this.proofToBigIntArray(proofData.proof);

      // Get verification key
      const fetchedVkey = await this.getCircuitVerificationKey(proofResult);
      assert(fetchedVkey, "Failed to get verification key");

      // Extract public inputs and commitments based on circuit type
      const { publicInputs, commitments } = this.extractCommitments(
        proofData,
        circuitType,
        proofResult.name
      );

      // Validate all data
      this.validateProofData(
        fetchedVkey.vkeyFields,
        formattedProofData,
        publicInputs,
        commitments,
        circuitType
      );

      return {
        vkey: fetchedVkey.vkeyFields,
        proof: formattedProofData,
        public_inputs: publicInputs,
        vkey_hash: BigInt(fetchedVkey.vkeyHash),
        commitments: commitments,
      };
    } catch (error) {
      this.logError(`formatSubCircuit${circuitType}`, error);
      throw new Error(
        `Failed to format SubCircuit${circuitType}: Invalid or missing data`
      );
    }
  }

  private static proofToBigIntArray(proof: string[]): bigint[] {
    return proof.map((hexStr: string) => {
      return BigInt(hexStr.startsWith("0x") ? hexStr : `0x${hexStr}`);
    });
  }

  private static extractCommitments(
    proofData: { proof: string[]; publicInputs: string[] },
    circuitType: CircuitType,
    proofName?: string
  ): { publicInputs: bigint[]; commitments: bigint[] } {
    const publicInputs = this.proofToBigIntArray(proofData.publicInputs);
    console.log("Public inputs: for proof", proofName, publicInputs);

    let commitments: bigint[] = [];

    try {
      switch (circuitType) {
        case "A": // DSC proof
          const root = getMerkleRootFromDSCProof(proofData);
          const commitment = getCommitmentFromDSCProof(proofData);
          commitments = [root, commitment];
          break;

        case "B": // ID Data proof
          const commitmentInB = getCommitmentInFromIDDataProof(proofData);
          const commitmentOutB = getCommitmentOutFromIDDataProof(proofData);
          commitments = [commitmentInB, commitmentOutB];
          break;

        case "C": // Integrity proof
          const commitmentInC = getCommitmentInFromIntegrityProof(proofData);
          const commitmentOutC = getCommitmentOutFromIntegrityProof(proofData);
          commitments = [commitmentInC, commitmentOutC];
          break;

        case "D": // Disclosure proof (formerly E)
        case "E": // Age comparison proof (formerly F)
          const commitmentInDE = getCommitmentInFromDisclosureProof(proofData);
          const nullifierDE = getNullifierFromDisclosureProof(proofData);
          commitments = [commitmentInDE, nullifierDE];
          break;
      }
    } catch (extractionError) {
      console.error(
        `Error extracting public inputs for SubCircuit${circuitType}:`,
        extractionError
      );
      throw extractionError;
    }

    return { publicInputs, commitments };
  }

  public static base64ToUint8Array(base64: string): Uint8Array {
    const buffer = Buffer.from(base64, "base64");
    return new Uint8Array(buffer);
  }
}
