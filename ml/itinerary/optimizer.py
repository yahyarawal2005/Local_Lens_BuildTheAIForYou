"""
Itinerary Optimizer for Local & Experiences.
Solves the multi-dimensional knapsack problem (time and monetary budget constraints)
across scored candidate experiences, comparing multiple greedy & combinatorial heuristics,
and orders the selected stops geographically.
"""
from typing import Any, Dict, List, Optional, Tuple
import copy
import logging
import numpy as np

from ml.preprocessing.features import calculate_haversine_distance

logger = logging.getLogger(__name__)


class ItineraryOptimizer:
    """
    Optimizes multi-stop day itineraries matching traveler time, budget, and location.
    """

    def __init__(self):
        pass

    @staticmethod
    def _evaluate_greedy(
        sorted_candidates: List[Dict[str, Any]],
        available_time_hours: float,
        budget_inr: float,
        max_stops: int,
    ) -> Tuple[List[Dict[str, Any]], float, float, float]:
        """
        Greedily pack candidates from the given ordered list within budget and time.
        Returns: (selected_items, total_score, total_duration, total_price)
        """
        selected: List[Dict[str, Any]] = []
        total_score = 0.0
        total_duration = 0.0
        total_price = 0.0

        for item in sorted_candidates:
            if len(selected) >= max_stops:
                break

            duration = float(item.get("duration_hours", 0.0))
            price = float(item.get("price_inr", 0.0))
            score = float(item.get("recommendation_score", 0.0))

            if (total_duration + duration <= available_time_hours + 1e-6) and (
                total_price + price <= budget_inr + 1e-6
            ):
                selected.append(item)
                total_score += score
                total_duration += duration
                total_price += price

        return selected, total_score, total_duration, total_price

    @staticmethod
    def _branch_and_bound_knapsack(
        candidates: List[Dict[str, Any]],
        available_time_hours: float,
        budget_inr: float,
        max_stops: int,
        search_pool_size: int = 20,
    ) -> Tuple[List[Dict[str, Any]], float, float, float]:
        """
        Exact search over top candidate pool to find the maximum score combination.
        """
        pool = candidates[:search_pool_size]
        n = len(pool)
        best_selected: List[Dict[str, Any]] = []
        best_score = -1.0
        best_duration = 0.0
        best_price = 0.0

        def backtrack(
            idx: int,
            current_selected: List[Dict[str, Any]],
            current_score: float,
            current_duration: float,
            current_price: float,
        ):
            nonlocal best_selected, best_score, best_duration, best_price

            if current_score > best_score:
                best_score = current_score
                best_selected = list(current_selected)
                best_duration = current_duration
                best_price = current_price

            if idx >= n or len(current_selected) >= max_stops:
                return

            # Upper bound heuristic for pruning
            remaining_score = sum(float(pool[i].get("recommendation_score", 0.0)) for i in range(idx, n))
            if current_score + remaining_score <= best_score:
                return

            item = pool[idx]
            dur = float(item.get("duration_hours", 0.0))
            prc = float(item.get("price_inr", 0.0))
            sc = float(item.get("recommendation_score", 0.0))

            # Option 1: Include item if feasible
            if (current_duration + dur <= available_time_hours + 1e-6) and (
                current_price + prc <= budget_inr + 1e-6
            ):
                current_selected.append(item)
                backtrack(
                    idx + 1,
                    current_selected,
                    current_score + sc,
                    current_duration + dur,
                    current_price + prc,
                )
                current_selected.pop()

            # Option 2: Exclude item
            backtrack(
                idx + 1,
                current_selected,
                current_score,
                current_duration,
                current_price,
            )

        backtrack(0, [], 0.0, 0.0, 0.0)
        return best_selected, best_score, best_duration, best_price

    def optimize_itinerary(
        self,
        candidate_experiences: List[Dict[str, Any]],
        available_time_hours: float,
        budget_inr: float,
        user_lat: Optional[float] = None,
        user_lon: Optional[float] = None,
        max_stops: int = 6,
    ) -> Dict[str, Any]:
        """
        Find the optimal combination of experiences maximizing total recommendation score
        subject to time and money constraints, and order them by travel route.

        Parameters:
          - candidate_experiences: List of scored candidate dicts (from RecommendationEngine).
          - available_time_hours: Total time budget in hours.
          - budget_inr: Total money budget in INR.
          - user_lat, user_lon: Starting coordinates of the user.
          - max_stops: Maximum number of stops in the itinerary (default 6).

        Returns:
          Structured itinerary dict with ordered stops, total cost, duration, score, and route summary.
        """
        if not candidate_experiences:
            return {
                "stops": [],
                "stop_count": 0,
                "total_duration_hours": 0.0,
                "total_price_inr": 0.0,
                "total_score": 0.0,
                "remaining_budget_inr": float(budget_inr),
                "remaining_time_hours": float(available_time_hours),
                "strategy_used": "none",
                "total_route_distance_km": 0.0,
            }

        # Filter out any single item exceeding total budget or time limits
        valid_pool = [
            c
            for c in candidate_experiences
            if float(c.get("duration_hours", 0.0)) <= available_time_hours + 1e-6
            and float(c.get("price_inr", 0.0)) <= budget_inr + 1e-6
        ]

        if not valid_pool:
            return {
                "stops": [],
                "stop_count": 0,
                "total_duration_hours": 0.0,
                "total_price_inr": 0.0,
                "total_score": 0.0,
                "remaining_budget_inr": float(budget_inr),
                "remaining_time_hours": float(available_time_hours),
                "strategy_used": "no_feasible_candidates",
                "total_route_distance_km": 0.0,
            }

        strategies: Dict[str, List[Dict[str, Any]]] = {}

        # Strategy 1: Greedy by raw recommendation score descending
        strategies["score_desc"] = sorted(
            valid_pool,
            key=lambda x: float(x.get("recommendation_score", 0.0)),
            reverse=True,
        )

        # Strategy 2: Greedy by score per hour (efficiency per unit time)
        strategies["score_per_hour"] = sorted(
            valid_pool,
            key=lambda x: float(x.get("recommendation_score", 0.0))
            / max(float(x.get("duration_hours", 0.0)), 0.5),
            reverse=True,
        )

        # Strategy 3: Greedy by score per cost (efficiency per INR)
        strategies["score_per_cost"] = sorted(
            valid_pool,
            key=lambda x: float(x.get("recommendation_score", 0.0))
            / max(float(x.get("price_inr", 0.0)), 100.0),
            reverse=True,
        )

        # Strategy 4: Composite density (normalized budget + normalized time)
        b_safe = max(budget_inr, 1.0)
        t_safe = max(available_time_hours, 0.5)
        strategies["composite_density"] = sorted(
            valid_pool,
            key=lambda x: float(x.get("recommendation_score", 0.0))
            / (
                0.5 * (float(x.get("price_inr", 0.0)) / b_safe)
                + 0.5 * (float(x.get("duration_hours", 0.0)) / t_safe)
                + 1e-4
            ),
            reverse=True,
        )

        best_combo: List[Dict[str, Any]] = []
        best_score = -1.0
        best_strategy = "none"
        best_duration = 0.0
        best_price = 0.0

        # Evaluate each greedy strategy
        for strat_name, ordered_items in strategies.items():
            sel, sc, dur, prc = self._evaluate_greedy(
                ordered_items, available_time_hours, budget_inr, max_stops
            )
            if sc > best_score:
                best_score = sc
                best_combo = sel
                best_strategy = strat_name
                best_duration = dur
                best_price = prc

        # Evaluate exact branch-and-bound on top 20 candidates
        if len(valid_pool) > 0:
            exact_sel, exact_sc, exact_dur, exact_prc = self._branch_and_bound_knapsack(
                strategies["score_desc"],
                available_time_hours,
                budget_inr,
                max_stops,
                search_pool_size=min(len(valid_pool), 20),
            )
            if exact_sc > best_score:
                best_score = exact_sc
                best_combo = exact_sel
                best_strategy = "branch_and_bound"
                best_duration = exact_dur
                best_price = exact_prc

        # Order final stops by geographic distance
        ordered_stops, total_route_distance = self._order_stops_geographically(
            best_combo, user_lat, user_lon
        )

        return {
            "stops": ordered_stops,
            "stop_count": len(ordered_stops),
            "total_duration_hours": round(float(best_duration), 2),
            "total_price_inr": round(float(best_price), 2),
            "total_score": round(float(best_score), 4),
            "remaining_budget_inr": round(float(budget_inr - best_price), 2),
            "remaining_time_hours": round(float(available_time_hours - best_duration), 2),
            "strategy_used": best_strategy,
            "total_route_distance_km": round(float(total_route_distance), 2),
        }

    def _order_stops_geographically(
        self,
        stops: List[Dict[str, Any]],
        user_lat: Optional[float],
        user_lon: Optional[float],
    ) -> Tuple[List[Dict[str, Any]], float]:
        """
        Order stops using a Nearest-Neighbor TSP heuristic starting from user coordinates.
        Attaches sequence number, segment distance, and cumulative duration/cost.
        """
        if not stops:
            return [], 0.0

        has_coords = all(
            s.get("latitude") is not None and s.get("longitude") is not None for s in stops
        )

        unvisited = copy.deepcopy(stops)
        ordered: List[Dict[str, Any]] = []
        total_dist = 0.0

        curr_lat = user_lat
        curr_lon = user_lon

        # If user coordinates not provided, start from first stop's coords or keep original order
        if curr_lat is None or curr_lon is None:
            if has_coords:
                curr_lat = float(unvisited[0]["latitude"])
                curr_lon = float(unvisited[0]["longitude"])
            else:
                # No coordinates available, return in selection order
                for i, st in enumerate(unvisited, start=1):
                    st["stop_sequence"] = i
                    st["segment_distance_km"] = 0.0
                return unvisited, 0.0

        cum_dur = 0.0
        cum_price = 0.0
        seq = 1

        while unvisited:
            best_idx = 0
            best_d = float("inf")

            for i, st in enumerate(unvisited):
                st_lat = st.get("latitude")
                st_lon = st.get("longitude")
                if st_lat is not None and st_lon is not None:
                    d = float(calculate_haversine_distance(curr_lat, curr_lon, st_lat, st_lon))
                else:
                    d = 0.0

                if d < best_d:
                    best_d = d
                    best_idx = i

            chosen = unvisited.pop(best_idx)
            seg_dist = 0.0 if best_d == float("inf") else best_d
            total_dist += seg_dist

            dur = float(chosen.get("duration_hours", 0.0))
            prc = float(chosen.get("price_inr", 0.0))
            cum_dur += dur
            cum_price += prc

            chosen["stop_sequence"] = seq
            chosen["segment_distance_km"] = round(seg_dist, 2)
            chosen["cumulative_duration_hours"] = round(cum_dur, 2)
            chosen["cumulative_price_inr"] = round(cum_price, 2)

            ordered.append(chosen)

            if chosen.get("latitude") is not None and chosen.get("longitude") is not None:
                curr_lat = float(chosen["latitude"])
                curr_lon = float(chosen["longitude"])
            seq += 1

        return ordered, total_dist
