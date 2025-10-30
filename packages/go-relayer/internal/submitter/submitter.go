package submitter

import "context"

type VAASubmitter interface {
	// SubmitVAA submits the given VAA bytes to the target contract and returns the transaction hash or an error
	SubmitVAA(ctx context.Context, vaaBytes []byte) (string, error)
}


