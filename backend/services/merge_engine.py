def merge_skills(rule_based: list[str], ai_skills_data: list[dict]) -> tuple[str, str, str]:
    """
    Merges rule-based skills and AI skills.
    Rule-based skills are assigned a default confidence of 0.85 if they aren't caught by AI.
    If AI catches it with higher confidence, AI wins.
    Returns:
        (rule_based_str, ai_skills_str, merged_metadata_json)
    """
    import json
    
    # Normalize rule-based skills to lower for deduplication
    rb_map = {s.lower(): s for s in rule_based if s.strip()}
    
    merged_map = {}
    
    # 1. Add AI skills to merged map
    for skill in ai_skills_data:
        name = skill.get("name", "").strip()
        if not name:
            continue
        key = name.lower()
        confidence = float(skill.get("confidence", 0.0))
        merged_map[key] = {
            "name": name,
            "confidence": confidence,
            "source": skill.get("source", "AI"),
            "reason": skill.get("reason", "")
        }
        
    # 2. Add/Merge Rule-based skills
    for rb_key, rb_name in rb_map.items():
        if rb_key in merged_map:
            # Already found by AI. Let's assume AI confidence is what we keep, but if it's very low, maybe bump it?
            # Actually user said "Prefer higher confidence version". Rule-based gets 0.85.
            if merged_map[rb_key]["confidence"] < 0.85:
                merged_map[rb_key]["confidence"] = 0.85
                merged_map[rb_key]["source"] = "Rule-Based + AI"
                merged_map[rb_key]["reason"] = "Supported by rule-based taxonomy matching."
        else:
            merged_map[rb_key] = {
                "name": rb_name,
                "confidence": 0.85,
                "source": "Rule-Based",
                "reason": "Matched exactly against taxonomy terms."
            }
            
    # Sort by confidence descending
    merged_list = sorted(merged_map.values(), key=lambda x: x["confidence"], reverse=True)
    
    rule_str = ", ".join([rb_map[k] for k in rb_map])
    ai_str = ", ".join([s.get("name", "") for s in ai_skills_data if s.get("name", "").strip()])
    merged_str = ", ".join([s.get("name", "") for s in merged_list])
    
    return rule_str, ai_str, merged_str, json.dumps(merged_list)
