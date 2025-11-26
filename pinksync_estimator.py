import math
from typing import Dict, Any

class PinkSyncEstimator:
    """
    PinkSyncEstimator
    
    The core engine for forecasting resource usage, timing, and costs for data
    synchronization and AI inference within the MBTQ ecosystem. This class ensures
    that synchronization workflows (orchestrated by PinkSync) and adaptive AI
    computations (360Magicians) are financially viable and meet performance SLAs.

    The logic for time and cost calculations is centralized here for auditability
    and unit testing.

    :ivar BITS_PER_BYTE: Constant for converting bytes to bits (8).
    :vartype BITS_PER_BYTE: int
    """

    BITS_PER_BYTE: int = 8

    def __init__(self):
        """
        Initializes the PinkSyncEstimator instance.
        """
        pass

    def calculate_sync_time(
        self,
        data_size_gb: float,
        bandwidth_mbps: float,
        file_count: int,
        latency_ms: float
    ) -> Dict[str, float]:
        """
        Calculates the estimated time required for a full synchronization operation.

        The total time is the sum of raw data transfer time and orchestration overhead.

        :param data_size_gb: Total size of data to transfer in Gigabytes (GB).
        :type data_size_gb: float
        :param bandwidth_mbps: Available network bandwidth in Megabits per second (Mbps).
        :type bandwidth_mbps: float
        :param file_count: Total number of individual items/files to be processed.
        :type file_count: int
        :param latency_ms: Per-item overhead latency in milliseconds (ms). Simulates DeafAUTH checks and API routing.
        :type latency_ms: float
        :raises ValueError: If bandwidth_mbps is zero or negative.
        :returns: A dictionary containing 'total_seconds', 'transfer_seconds', and 'overhead_seconds'.
        :rtype: Dict[str, float]
        """
        if bandwidth_mbps <= 0:
            raise ValueError("Bandwidth must be greater than zero.")

        # 1. Raw Data Transfer Time (Physical File Movement)
        # Convert GB to Megabits: GB * 1024 * 8
        data_size_megabits = data_size_gb * 1024 * self.BITS_PER_BYTE
        transfer_seconds = data_size_megabits / bandwidth_mbps

        # 2. Orchestration Overhead Time (PinkSync/DeafAUTH Checks)
        # Convert total latency from milliseconds to seconds: (Count * MS) / 1000
        overhead_seconds = (file_count * latency_ms) / 1000.0

        return {
            'total_seconds': transfer_seconds + overhead_seconds,
            'transfer_seconds': transfer_seconds,
            'overhead_seconds': overhead_seconds
        }

    def calculate_total_cost(
        self,
        data_size_gb: float,
        cost_per_gb: float,
        file_count: int,
        ai_cost_per_run: float
    ) -> Dict[str, float]:
        """
        Calculates the estimated financial cost for the operation.

        The total cost is the sum of network transfer fees and 360Magicians AI compute costs.

        :param data_size_gb: Total size of data transferred in Gigabytes (GB).
        :type data_size_gb: float
        :param cost_per_gb: Network egress/transfer fee per Gigabyte ($).
        :type cost_per_gb: float
        :param file_count: Total number of items triggering an AI inference.
        :type file_count: int
        :param ai_cost_per_run: Cost of a single AI/LLM inference or specialized GPU run ($).
        :type ai_cost_per_run: float
        :returns: A dictionary containing 'total_cost', 'transfer_cost', and 'ai_cost'.
        :rtype: Dict[str, float]
        """
        # 1. Transfer Cost (Network Egress)
        transfer_cost = data_size_gb * cost_per_gb

        # 2. AI Execution Cost (360Magicians Inference)
        ai_cost = file_count * ai_cost_per_run

        return {
            'total_cost': transfer_cost + ai_cost,
            'transfer_cost': transfer_cost,
            'ai_cost': ai_cost
        }

    def generate_recommendation(self, total_cost: float, ai_cost: float) -> Dict[str, Any]:
        """
        Generates financial and compliance recommendations based on cost ratios.

        This method is critical for enforcing cost governance within the 360Magicians agents.

        :param total_cost: The total calculated cost of the operation.
        :type total_cost: float
        :param ai_cost: The cost attributed solely to AI execution.
        :type ai_cost: float
        :returns: A dictionary containing 'ratio', 'flag', and 'message'.
        :rtype: Dict[str, Any]
        """
        if total_cost == 0:
            return {'ratio': 0, 'flag': 'GREEN', 'message': 'Cost structure is efficient (Zero cost operation).'}

        ai_cost_ratio = (ai_cost / total_cost) * 100

        if ai_cost_ratio > 70:
            return {
                'ratio': ai_cost_ratio,
                'flag': 'RED',
                'message': '🚨 HIGH COST WARNING: AI dominates budget. Consider switching to RAG/GPT-3.5 or optimizing execution.'
            }
        elif ai_cost_ratio < 20:
            return {
                'ratio': ai_cost_ratio,
                'flag': 'GREEN',
                'message': '✅ Cost Structure is Efficient: AI use is minimal. Focus optimization on reducing transfer fees.'
            }
        else:
            return {
                'ratio': ai_cost_ratio,
                'flag': 'YELLOW',
                'message': f'Budget is balanced. AI spend is acceptable at {ai_cost_ratio:.0f}% of total.'
            }
