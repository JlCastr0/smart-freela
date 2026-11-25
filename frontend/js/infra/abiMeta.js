import { CONTRACT_ABI } from "../config/contract.js";

/**
 * Deriva automaticamente metadados estruturados a partir da CONTRACT_ABI,
 * reduzindo o acoplamento do EscrowContractService às assinaturas exatas da ABI.
 */
export function buildAbiMetadata(abi = CONTRACT_ABI) {
  const functions = {};
  const events = {};
  const errors = {};

  const functionList = [];
  const viewFunctions = [];
  const writeFunctions = [];
  const payableFunctions = [];

  for (const item of abi) {
    if (!item || !item.type) continue;

    if (item.type === "function" && item.name) {
      const inputs = Array.isArray(item.inputs)
        ? item.inputs.map((inp, idx) => ({
            index: idx,
            name: inp.name || `arg${idx}`,
            type: inp.type,
            internalType: inp.internalType || inp.type,
            components: inp.components || null,
          }))
        : [];

      const outputs = Array.isArray(item.outputs)
        ? item.outputs.map((out, idx) => ({
            index: idx,
            name: out.name || `out${idx}`,
            type: out.type,
            internalType: out.internalType || out.type,
            components: out.components || null,
          }))
        : [];

      const meta = {
        name: item.name,
        stateMutability: item.stateMutability || "nonpayable",
        inputs,
        outputs,
        isView:
          item.stateMutability === "view" || item.stateMutability === "pure",
        isPayable: item.stateMutability === "payable",
      };

      functions[item.name] = meta;
      functionList.push(meta);

      if (meta.isView) {
        viewFunctions.push(meta);
      } else {
        writeFunctions.push(meta);
      }
      if (meta.isPayable) {
        payableFunctions.push(meta);
      }
    } else if (item.type === "event" && item.name) {
      events[item.name] = {
        name: item.name,
        anonymous: Boolean(item.anonymous),
        inputs: Array.isArray(item.inputs)
          ? item.inputs.map((inp, idx) => ({
              index: idx,
              name: inp.name || `arg${idx}`,
              type: inp.type,
              internalType: inp.internalType || inp.type,
              indexed: Boolean(inp.indexed),
            }))
          : [],
      };
    } else if (item.type === "error" && item.name) {
      errors[item.name] = {
        name: item.name,
        inputs: Array.isArray(item.inputs)
          ? item.inputs.map((inp, idx) => ({
              index: idx,
              name: inp.name || `arg${idx}`,
              type: inp.type,
              internalType: inp.internalType || inp.type,
            }))
          : [],
      };
    }
  }

  // Extrai automaticamente os campos da struct Project a partir de getProject ou projects
  const projectSourceFn = functions.getProject || functions.projects || null;
  let projectStructFields = [];

  if (projectSourceFn) {
    const tupleOutput = projectSourceFn.outputs.find(
      (o) => o.type === "tuple" && Array.isArray(o.components)
    );
    if (tupleOutput) {
      projectStructFields = tupleOutput.components.map((c, idx) => ({
        index: idx,
        name: c.name,
        type: c.type,
        internalType: c.internalType || c.type,
      }));
    } else if (projectSourceFn.outputs.length > 0) {
      projectStructFields = projectSourceFn.outputs.map((o) => ({
        index: o.index,
        name: o.name,
        type: o.type,
        internalType: o.internalType,
      }));
    }
  }

  return {
    functions,
    events,
    errors,
    functionList,
    viewFunctions,
    writeFunctions,
    payableFunctions,
    projectStructFields,
    hasFunction(fnName) {
      return Boolean(functions[fnName]);
    },
    hasEvent(eventName) {
      return Boolean(events[eventName]);
    },
    hasError(errorName) {
      return Boolean(errors[errorName]);
    },
  };
}

export const ABI_META = buildAbiMetadata(CONTRACT_ABI);