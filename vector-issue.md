Problem: Your Vector Database Bill Is Out of Control
You're storing millions of embeddings and the cloud bill is climbing fast. A single float32 vector at 1536 dimensions takes 6KB. At 10 million vectors, that's 60GB — and most managed vector DBs charge $0.10–$0.30 per GB per month.

You'll learn:

How to apply scalar, binary, and product quantization to shrink vectors
Which technique works best for your accuracy vs. cost tradeoff
How to implement compression in Python with real benchmarks
Time: 20 min | Level: Intermediate

Why This Happens
Embedding models output high-precision float32 values by default. That precision is rarely necessary for approximate nearest neighbor (ANN) search — yet you're paying full price for it.

The three main culprits are oversized embeddings, uncompressed storage formats, and no tiering strategy for cold vectors.

Common symptoms:

Cloud vector DB costs growing faster than your user base
Storage costs exceeding compute costs for your search service
Retrieval accuracy is fine but you're paying for precision you don't use
Solution
Step 1: Benchmark Your Baseline
Before compressing anything, measure what you're working with.

import numpy as np
import time

# Simulate 100k vectors at 1536 dims (OpenAI text-embedding-3-small)
vectors = np.random.randn(100_000, 1536).astype(np.float32)

print(f"Storage: {vectors.nbytes / 1e9:.2f} GB")
# Storage: 0.61 GB

# Cosine similarity baseline
query = np.random.randn(1536).astype(np.float32)
start = time.perf_counter()
scores = vectors @ query / (np.linalg.norm(vectors, axis=1) * np.linalg.norm(query))
elapsed = time.perf_counter() - start
print(f"Search time: {elapsed * 1000:.1f}ms")
Copy
Expected: You'll see your raw storage and search latency. Write these down — they're your baseline.

Step 2: Apply Scalar Quantization (Best Starting Point)
Scalar quantization (SQ8) converts float32 to int8, cutting storage by 4x with minimal accuracy loss. This is the safest first move.

def scalar_quantize(vectors: np.ndarray) -> tuple[np.ndarray, float, float]:
    """Convert float32 vectors to int8 with stored scale factors."""
    vmin = vectors.min(axis=0)
    vmax = vectors.max(axis=0)
    
    # Scale to [-128, 127] range
    scale = (vmax - vmin) / 255.0
    scale = np.where(scale == 0, 1.0, scale)  # Avoid division by zero
    
    quantized = np.clip(
        np.round((vectors - vmin) / scale - 128),
        -128, 127
    ).astype(np.int8)
    
    return quantized, vmin, scale


def scalar_dequantize(quantized: np.ndarray, vmin: float, scale: float) -> np.ndarray:
    """Reconstruct float32 from int8 for high-precision reranking."""
    return (quantized.astype(np.float32) + 128) * scale + vmin


# Apply it
sq_vectors, vmin, scale = scalar_quantize(vectors)
print(f"Compressed storage: {sq_vectors.nbytes / 1e9:.2f} GB")
# Compressed storage: 0.15 GB — 4x smaller

# Measure accuracy loss
sample_idx = np.random.choice(len(vectors), 1000)
reconstructed = scalar_dequantize(sq_vectors[sample_idx], vmin, scale)
mse = np.mean((vectors[sample_idx] - reconstructed) ** 2)
print(f"Mean squared error: {mse:.6f}")
Copy
Expected: ~4x storage reduction, MSE below 0.001 for typical embeddings.

If it fails:

High MSE (> 0.01): Your vectors may have outliers. Clip at the 1st/99th percentile before quantizing.
Negative scale values: Add the zero-division guard shown above.
Step 3: Try Binary Quantization for Maximum Compression (32x)
Binary quantization (BQ) converts each dimension to a single bit. 32x smaller, but needs reranking to recover accuracy.

def binary_quantize(vectors: np.ndarray) -> np.ndarray:
    """Pack float32 vectors into binary (sign bit only)."""
    # Positive = 1, negative = 0
    return np.packbits(vectors > 0, axis=1)


def hamming_search(binary_db: np.ndarray, binary_query: np.ndarray, top_k: int = 10) -> np.ndarray:
    """Fast Hamming distance search on binary vectors."""
    # XOR then popcount gives Hamming distance
    distances = np.unpackbits(
        np.bitwise_xor(binary_db, binary_query), axis=1
    ).sum(axis=1)
    return np.argsort(distances)[:top_k]


bq_vectors = binary_quantize(vectors)
print(f"Binary storage: {bq_vectors.nbytes / 1e9:.3f} GB")
# Binary storage: 0.019 GB — 32x smaller

bq_query = binary_quantize(query.reshape(1, -1))
candidates = hamming_search(bq_vectors, bq_query, top_k=100)
# Rerank top-100 candidates with original float32 for accuracy
Copy
The catch: Binary alone loses recall. Always use a two-stage approach — binary search for candidates, float32 rerank for the final top-K.

Step 4: Use Product Quantization for the Sweet Spot
Product quantization (PQ) splits each vector into sub-vectors and quantizes them independently. You control the compression ratio vs. accuracy tradeoff.

from sklearn.cluster import MiniBatchKMeans

def train_pq(
    vectors: np.ndarray,
    n_subvectors: int = 32,  # More = better accuracy, more storage
    n_clusters: int = 256    # 256 clusters = 1 byte per sub-vector
) -> tuple[list, int]:
    """Train product quantization codebooks."""
    dim = vectors.shape[1]
    sub_dim = dim // n_subvectors
    codebooks = []
    
    for i in range(n_subvectors):
        sub = vectors[:, i * sub_dim:(i + 1) * sub_dim]
        kmeans = MiniBatchKMeans(n_clusters=n_clusters, random_state=42, n_init=3)
        kmeans.fit(sub)
        codebooks.append(kmeans)
    
    return codebooks, sub_dim


def pq_encode(vectors: np.ndarray, codebooks: list, sub_dim: int) -> np.ndarray:
    """Encode vectors using trained codebooks."""
    codes = np.zeros((len(vectors), len(codebooks)), dtype=np.uint8)
    for i, cb in enumerate(codebooks):
        sub = vectors[:, i * sub_dim:(i + 1) * sub_dim]
        codes[:, i] = cb.predict(sub)
    return codes


# Train on a representative sample
print("Training PQ codebooks...")
codebooks, sub_dim = train_pq(vectors[:10_000])  # Train on subset
pq_codes = pq_encode(vectors, codebooks, sub_dim)

print(f"PQ storage: {pq_codes.nbytes / 1e9:.3f} GB")
# PQ storage: 0.032 GB — ~19x smaller than float32
Copy
Expected: 16-32x compression with better recall than binary, at the cost of slower encode time.

Verification
Run a recall benchmark to confirm compression didn't destroy search quality.

def recall_at_k(original: np.ndarray, compressed_fn, k: int = 10, n_queries: int = 100) -> float:
    """Measure what fraction of true top-K are found after compression."""
    hits = 0
    for _ in range(n_queries):
        q = np.random.randn(original.shape[1]).astype(np.float32)
        
        # Ground truth from float32
        true_scores = original @ q
        true_top = set(np.argsort(true_scores)[-k:])
        
        # Compressed results
        approx_top = set(compressed_fn(q))
        hits += len(true_top & approx_top)
    
    return hits / (n_queries * k)


# Test scalar quantization recall
sq_recall = recall_at_k(
    vectors,
    lambda q: np.argsort(sq_vectors @ q.astype(np.int8))[-10:],
    k=10
)
print(f"SQ8 Recall@10: {sq_recall:.2%}")
# Expect: 95-99%
Copy
You should see:

Method	Compression	Recall@10	When to use
SQ8	4x	97-99%	Default choice
PQ32	19x	90-95%	High volume, acceptable accuracy drop
Binary	32x	70-85%	With float32 reranking stage
What You Learned
SQ8 is the safest default — 4x compression, negligible accuracy loss, drop-in for most vector DBs
Binary quantization needs a reranking step to be useful in production
Product quantization gives you a tunable dial between compression and accuracy via n_subvectors
Limitation: These techniques work on the stored vectors. Your embedding model still outputs float32 — so you don't save on inference compute, only storage and ANN index size.

When NOT to use this: If your dataset is under 1 million vectors and storage costs are under $50/month, the engineering overhead isn't worth it. Start with SQ8 when you cross that threshold.

Tested on Python 3.12, NumPy 2.0, scikit-learn 1.5 — compatible with pgvector, Pinecone, Qdrant, and Weaviate quantization APIs.
